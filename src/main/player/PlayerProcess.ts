import {AudioIO, getDevices, getHostAPIs, IoStreamWrite, SampleFormatFloat32} from "@underswing/naudiodon";
import {parentPort} from "node:worker_threads";
import {clearInterval} from "node:timers";
import {SourceType} from "../../shared/PlayerState.js";

const BUFFER_SIZE = 1024;
const MAX_QUEUE = 4;
const IPC_UPDATE_INTERVAL = 200;

type PlayerSession = {
    path: string;
    readOffset: number;
    waitingForData: boolean;
    duration: number;
    pcm: Float32Array;
    writtenIndex: Int32Array;
    sourceType: SourceType;
};

interface DeviceInformation {
    silentBuffer: Buffer;
    samplesPerBuffer: number;
    inactive: boolean;
    out: OutputDevice;
}

interface OutputDevice {
    channels: number;
    sampleRate: number;
    deviceId: number;
}

type StateMessage = {
    currentTrack: string;
    currentTime: number;
    waitingForData: boolean;
    userPaused: boolean;
    duration: number;
    latency: number;
    sourceType: SourceType;
};

export class PlayerProcess {
    private io: IoStreamWrite | null = null;
    private deviceInfo: DeviceInformation | null = null;
    private chunkerLoopPromise: Promise<void> | null = null;
    private session: PlayerSession | null = null;
    private lastActiveTime: number = Date.now();
    private idleTimeoutMs: number = 2 * 60 * 1000;

    private userPaused = false;
    private volume: number = 1;

    private stateLoopInterval: NodeJS.Timeout | null = null;

    private async chunkerLoop() {
        while (this.deviceInfo && this.io && !this.deviceInfo.inactive) {
            let outputBuf: Buffer = this.deviceInfo.silentBuffer;

            if (this.session && !this.userPaused) {
                const {readOffset, pcm, writtenIndex} = this.session;
                const written = Atomics.load(writtenIndex, 0);
                let end = readOffset + this.deviceInfo.samplesPerBuffer;
                end = Math.min(end, written);

                if (readOffset < end) {
                    const chunk = pcm.subarray(readOffset, end);
                    outputBuf = this.applyVolume(
                        Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength),
                        this.volume
                    );

                    this.session.readOffset += this.deviceInfo.samplesPerBuffer;
                    this.session.waitingForData = false;
                } else {
                    this.session.waitingForData = true;
                }
            }

            if (!this.userPaused) {
                this.lastActiveTime = Date.now();
            }

            if (Date.now() - this.lastActiveTime > this.idleTimeoutMs) {
                console.log("Idle timeout reached. Shutting down audio device.");
                void this.suspendAudioDevice();
            }

            if (!this.io.write(outputBuf)) {
                await new Promise<void>((resolve) => {
                    const onDrain = () => {
                        this.io?.removeListener("drain", onDrain);
                        resolve();
                    };
                    this.io!.once("drain", onDrain);
                });
            }
        }

        await new Promise<void>(resolve => {
            this.io!.quit(() => {
                resolve();
            });
        });
    }

    private startStateLoop() {
        this.stopStateLoop();

        this.stateLoopInterval = setInterval(() => {
            if (!this.userPaused) this.notifyState();
        }, IPC_UPDATE_INTERVAL);
    }

    private stopStateLoop() {
        if (this.stateLoopInterval) {
            clearInterval(this.stateLoopInterval);
            this.stateLoopInterval = null;
        }
    }

    registerAudioDevice(devInfo?: OutputDevice) {
        if (this.io && this.deviceInfo) return;

        if(!devInfo) {
            const hostAPIs = getHostAPIs();
            const defaultId = hostAPIs.HostAPIs[hostAPIs.defaultHostAPI].defaultOutput;
            const devices = getDevices();
            const defaultDevice = devices[defaultId];
            devInfo = {
                channels: defaultDevice.maxOutputChannels,
                deviceId: defaultId,
                sampleRate: defaultDevice.defaultSampleRate
            };
        }

        const samplesPerBuffer = BUFFER_SIZE * devInfo.channels;
        const silentChunk = Buffer.alloc(samplesPerBuffer * Float32Array.BYTES_PER_ELEMENT);

        this.deviceInfo = {
            samplesPerBuffer: samplesPerBuffer,
            silentBuffer: silentChunk,
            inactive: false,
            out: {
                channels: devInfo.channels,
                sampleRate: devInfo.sampleRate,
                deviceId: devInfo.deviceId,
            }
        };

        this.io = AudioIO({
            outOptions: {
                channelCount: this.deviceInfo.out.channels,
                sampleFormat: SampleFormatFloat32,
                sampleRate: this.deviceInfo.out.sampleRate,
                deviceId: this.deviceInfo.out.deviceId,
                closeOnError: false,
                maxQueue: MAX_QUEUE
            }
        });
        this.io.start();

        console.log("Buffer transfer latency is " + Intl.NumberFormat("en", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(BUFFER_SIZE / this.deviceInfo.out.sampleRate * MAX_QUEUE * 1000) + "ms.");

        this.chunkerLoopPromise = this.chunkerLoop();
    }

    private async suspendAudioDevice() {
        if(this.deviceInfo) this.deviceInfo.inactive = true;
        this.userPaused = true;
        if (this.chunkerLoopPromise) {
            await this.chunkerLoopPromise;
            this.chunkerLoopPromise = null;
        }
        this.io = null;
    }

    load(path: string, duration: number, pcm: Float32Array, writtenIndex: Int32Array, devInfo: OutputDevice, sourceType: SourceType) {
        this.userPaused = false;

        this.session = {
            readOffset: 0,
            waitingForData: false,
            duration,
            path,
            pcm,
            writtenIndex,
            sourceType
        };

        this.registerAudioDevice(devInfo);
        this.notifyState();

        this.startStateLoop();
    }

    pauseOrResume() {
        if (this.userPaused) {
            this.userPaused = false;
            if (!this.io || !this.deviceInfo) {
                this.registerAudioDevice();
            }
        } else {
            this.userPaused = true;
        }

        this.notifyState();
    }

    seek(time: number) {
        if(!this.session || !this.deviceInfo) return;

        this.session.readOffset = this.toFrames(this.deviceInfo.out.channels, this.deviceInfo.out.sampleRate, time);
        this.notifyState();
    }

    private sliderToAmplitude(slider: number): number {
        slider = Math.max(0, Math.min(1, slider));
        if (slider <= 0) return 0;

        const minDb = -50;
        const maxDb = 0;
        const db = minDb + (maxDb - minDb) * slider;
        return Math.pow(10, db / 20);
    }

    async shutdown() {
        this.stopStateLoop();
        await this.suspendAudioDevice();
        this.deviceInfo = null;
        this.session = null;
        this.userPaused = true;

        parentPort?.close();
    }

    toSeconds(channels: number, sampleRate: number, timeInFrames: number) {
        const framesPlayed = timeInFrames / channels;
        return framesPlayed / sampleRate;
    }

    toFrames(channels: number, sampleRate: number, timeInSeconds: number) {
        const framesPlayed = timeInSeconds * channels;
        return framesPlayed * sampleRate;
    }

    private notifyState() {
        if (!this.deviceInfo || !this.session) return;

        const queuedLatencyFrames =
            this.deviceInfo.samplesPerBuffer * MAX_QUEUE;
        const latencySeconds = this.toSeconds(
            this.deviceInfo.out.channels,
            this.deviceInfo.out.sampleRate,
            queuedLatencyFrames
        );

        const currentTime =
            this.toSeconds(
                this.deviceInfo.out.channels,
                this.deviceInfo.out.sampleRate,
                this.session.readOffset
            ) - latencySeconds;

        const state: StateMessage = {
            currentTrack: this.session.path,
            currentTime: Math.max(0, currentTime),
            waitingForData: this.session.waitingForData,
            userPaused: this.userPaused,
            duration: this.session.duration,
            sourceType: this.session.sourceType,
            latency: latencySeconds
        };

        parentPort?.postMessage({type: "player-state", state});
    }

    setVolume(slider: number) {
        this.volume = this.sliderToAmplitude(slider);
    }

    applyVolume(buf: Buffer, volume: number): Buffer {
        const out = Buffer.allocUnsafe(buf.length);

        for (let i = 0; i < buf.length; i += 4) {
            let sample = buf.readFloatLE(i);
            sample = Math.max(-1, Math.min(1, sample * volume));
            out.writeFloatLE(sample, i);
        }

        return out;
    }
}

const playerProcess = new PlayerProcess();

interface IMsg {
    type: string;
    payload: unknown;
}

interface LoadPayload {
    path: string;
    duration: number;
    pcmSab: SharedArrayBuffer;
    writtenSab: SharedArrayBuffer;
    devInfo: OutputDevice;
    sourceType: SourceType;
}

parentPort?.on("message", (msg: IMsg) => {
    switch (msg.type) {
        case "load": {
            const info = msg.payload as LoadPayload;
            playerProcess.load(info.path, info.duration, new Float32Array(info.pcmSab), new Int32Array(info.writtenSab), info.devInfo, info.sourceType);
            break;
        }
        case "set-volume": {
            playerProcess.setVolume(msg.payload as number);
            break;
        }
        case "pause-or-resume": {
            playerProcess.pauseOrResume();
            break;
        }
        case "seek": {
            playerProcess.seek(msg.payload as number);
            break;
        }
        case "shutdown": {
            void playerProcess.shutdown();
        }
    }
});
