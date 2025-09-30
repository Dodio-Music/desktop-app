import {AudioIO, getDevices, getHostAPIs, IoStreamWrite, SampleFormatFloat32} from "@underswing/naudiodon";
import {parentPort} from "node:worker_threads";

const BUFFER_SIZE = 1024;
const MAX_QUEUE = 8;

type PlayerSession = {
    path: string;
    readOffset: number;
    waitingForData: boolean;
    duration: number;
    pcm: Float32Array;
    writtenIndex: Int32Array;
};

interface DeviceInformation {
    channels: number;
    sampleRate: number;
    deviceId: number;
    silentBuffer: Buffer;
    samplesPerBuffer: number;
}

type StateMessage = {
    currentTrack: string;
    currentTime: number;
    waitingForData: boolean;
    userPaused: boolean;
    duration: number;
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

    private async chunkerLoop() {
        while (this.deviceInfo && this.io) {
            let outputBuf: Buffer = this.deviceInfo.silentBuffer;

            if (this.session && !this.userPaused) {
                const {readOffset, pcm, writtenIndex} = this.session;
                const written = Atomics.load(writtenIndex, 0);
                const end = readOffset + this.deviceInfo.samplesPerBuffer;

                if (end <= written) {
                    const chunk = pcm.subarray(readOffset, end);
                    outputBuf = this.applyVolume(
                        Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength),
                        this.volume
                    );

                    this.session.readOffset += this.deviceInfo.samplesPerBuffer;
                    this.session.waitingForData = false;
                } else {
                    outputBuf = this.deviceInfo.silentBuffer;
                    this.session.waitingForData = true;
                }
            }

            if (!this.userPaused) {
                this.lastActiveTime = Date.now();
            }

            if (Date.now() - this.lastActiveTime > this.idleTimeoutMs) {
                console.log("Idle timeout reached. Shutting down audio device.");
                await this.suspendAudioDevice();
                return;
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

            this.notifyState();
        }

        await new Promise<void>(resolve => {
            this.io!.quit(() => {
                resolve();
            });
        });
    }

    registerAudioDevice() {
        if (this.io && this.deviceInfo) return;

        const hostAPIs = getHostAPIs();
        const defaultId = hostAPIs.HostAPIs[hostAPIs.defaultHostAPI].defaultOutput;
        const devices = getDevices();
        const defaultDevice = devices[defaultId];

        const samplesPerBuffer = BUFFER_SIZE * defaultDevice.maxOutputChannels;
        const silentChunk = Buffer.alloc(samplesPerBuffer * Float32Array.BYTES_PER_ELEMENT);

        this.deviceInfo = {
            channels: defaultDevice.maxOutputChannels,
            sampleRate: defaultDevice.defaultSampleRate,
            deviceId: defaultId,
            samplesPerBuffer: samplesPerBuffer,
            silentBuffer: silentChunk
        };

        this.io = AudioIO({
            outOptions: {
                channelCount: this.deviceInfo.channels,
                sampleFormat: SampleFormatFloat32,
                sampleRate: this.deviceInfo.sampleRate,
                deviceId: this.deviceInfo.deviceId,
                closeOnError: false,
                maxQueue: MAX_QUEUE
            }
        });
        this.io.start();
        console.log("Buffer transfer latency is " + Intl.NumberFormat("en", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(BUFFER_SIZE / this.deviceInfo.sampleRate * MAX_QUEUE * 1000) + "ms.");

        this.chunkerLoopPromise = this.chunkerLoop();
    }

    private async suspendAudioDevice() {
        this.deviceInfo = null;
        this.userPaused = true;
        if (this.chunkerLoopPromise) {
            await this.chunkerLoopPromise;
            this.chunkerLoopPromise = null;
        }
        this.io = null;
    }

    load(path: string, duration: number, pcm: Float32Array, writtenIndex: Int32Array) {
        this.userPaused = false;

        this.session = {
            readOffset: 0,
            waitingForData: false,
            duration,
            path,
            pcm,
            writtenIndex
        };

        this.registerAudioDevice();
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
        await this.suspendAudioDevice();
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

        const currentTime = this.toSeconds(this.deviceInfo.channels, this.deviceInfo.sampleRate, this.session.readOffset) ?? 0;

        const state: StateMessage = {
            currentTrack: this.session.path,
            currentTime,
            waitingForData: this.session.waitingForData,
            userPaused: this.userPaused,
            duration: this.session.duration
        };

        parentPort?.postMessage(state);
    }

    setVolume(slider: number) {
        this.volume = this.sliderToAmplitude(slider);
    }

    applyVolume(buf: Buffer, volume: number): Buffer {
        for (let i = 0; i < buf.length; i += 4) {
            let sample = buf.readFloatLE(i);
            sample = Math.max(-1, Math.min(1, sample * volume));
            buf.writeFloatLE(sample, i);
        }
        return buf;
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
}

parentPort?.on("message", (msg: IMsg) => {
    switch (msg.type) {
        case "load": {
            const info = msg.payload as LoadPayload;
            playerProcess.load(info.path, info.duration, new Float32Array(info.pcmSab), new Int32Array(info.writtenSab));
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
        case "shutdown": {
            void playerProcess.shutdown();
        }
    }
});
