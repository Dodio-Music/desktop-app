import {AudioIO, getDevices, getHostAPIs, IoStreamWrite, SampleFormatFloat32} from "@underswing/naudiodon";
import {parentPort} from "node:worker_threads";
import {clearInterval} from "node:timers";
import {SourceType} from "../../shared/PlayerState.js";
import {activePreset} from "../../shared/latencyPresets.js";

const IPC_UPDATE_INTERVAL = 200;
const IDLE_TIMEOUT_MS = 2 * 60 * 1000;

type PlayerSession = {
    path: string;
    readOffset: number;
    waitingForData: boolean;
    duration: number;
    pcm: Float32Array;
    writtenIndex: Int32Array;
    sourceType: SourceType;
    ended: boolean;
};

interface DeviceInformation {
    silentBuffer: Buffer;
    samplesPerBuffer: number;
    inactive: boolean;
    out: OutputDevice;
}

export interface OutputDevice {
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
    playbackRunning: boolean;
    sourceType: SourceType;
};

export class PlayerProcess {
    private io: IoStreamWrite | null = null;
    public deviceInfo: DeviceInformation | null = null;
    private chunkerLoopPromise: Promise<void> | null = null;
    private session: PlayerSession | null = null;
    private lastActiveTime: number = Date.now();
    public focused = true;

    private userPaused = true;
    private volume: number = 1;

    private stateLoopInterval: NodeJS.Timeout | null = null;

    private playheadAnchorFrames = 0;
    private playheadAnchorWall = Date.now();

    private async chunkerLoop() {
        while (this.deviceInfo && this.io && !this.deviceInfo.inactive) {
            let outputBuf: Buffer = this.deviceInfo.silentBuffer;

            if (this.session && !this.userPaused && !this.session.ended) {
                const {readOffset, pcm, writtenIndex} = this.session;
                const written = Atomics.load(writtenIndex, 0);
                let end = readOffset + this.deviceInfo.samplesPerBuffer;
                end = Math.min(end, written);

                if(readOffset > pcm.length) {
                    this.session.ended = true;
                }

                if (readOffset < end) {
                    if (this.session.waitingForData) {
                        const queuedLatencyFrames = this.getQueuedLatencyFrames();
                        this.playheadAnchorFrames = readOffset - queuedLatencyFrames;
                        this.playheadAnchorWall = Date.now();
                    }

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

            if (!this.userPaused || this.focused) {
                this.lastActiveTime = Date.now();
            }

            if (Date.now() - this.lastActiveTime > IDLE_TIMEOUT_MS) {
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
                channels: Math.min(defaultDevice.maxOutputChannels, 2),
                deviceId: defaultId,
                sampleRate: defaultDevice.defaultSampleRate
            };
        }

        const samplesPerBuffer = activePreset.bufferSize * devInfo.channels;
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
                maxQueue: activePreset.maxQueue
            }
        });
        this.io.start();

        console.log("Buffer transfer latency is " + Intl.NumberFormat("en", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(activePreset.bufferSize / this.deviceInfo.out.sampleRate * (activePreset.maxQueue + 1) * 1000) + "ms.");

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

    load(path: string, duration: number, pcm: Float32Array, writtenIndex: Int32Array, sourceType: SourceType) {
        if(!this.deviceInfo) return;

        this.userPaused = false;

        this.session = {
            readOffset: 0,
            waitingForData: true,
            duration,
            path,
            pcm,
            writtenIndex,
            sourceType,
            ended: false
        };

        const queuedLatencyFrames = this.getQueuedLatencyFrames();
        this.playheadAnchorFrames = this.session.readOffset - queuedLatencyFrames;
        this.playheadAnchorWall = Date.now();

        this.notifyState();

        this.startStateLoop();
    }

    pause() {
        if (this.deviceInfo && this.session) {
            const {out} = this.deviceInfo;
            const now = Date.now();
            const elapsed = (now - this.playheadAnchorWall) / 1000;
            const advancedFrames = elapsed * out.sampleRate * out.channels;
            this.playheadAnchorFrames = this.playheadAnchorFrames + advancedFrames;
            this.playheadAnchorWall = now;
        }
        this.userPaused = true;
    }

    resume() {
        this.userPaused = false;

        if (this.session && this.deviceInfo) {
            const queuedLatencyFrames = this.getQueuedLatencyFrames();
            this.playheadAnchorFrames = this.session.readOffset - queuedLatencyFrames;
            this.playheadAnchorWall = Date.now();
        }

        if (!this.io || !this.deviceInfo) {
            this.registerAudioDevice();
        }
    }

    pauseOrResume() {
        if(this.userPaused) this.resume();
        else this.pause();

        this.notifyState();
    }

    seek(time: number) {
        if(!this.session || !this.deviceInfo) return;

        this.session.readOffset = this.toFrames(this.deviceInfo.out.channels, this.deviceInfo.out.sampleRate, time);
        const queuedLatencyFrames = this.getQueuedLatencyFrames();
        this.playheadAnchorFrames = this.session.readOffset - queuedLatencyFrames;
        this.playheadAnchorWall = Date.now();

        this.notifyState();
    }

    private getQueuedLatencyFrames(): number {
        if (!this.deviceInfo) return 0;
        return this.deviceInfo.samplesPerBuffer * (activePreset.maxQueue + 1);
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

        const {out} = this.deviceInfo;
        const queuedLatencyFrames = this.getQueuedLatencyFrames();
        const latencySeconds = this.toSeconds(out.channels, out.sampleRate, queuedLatencyFrames);

        let playheadFrames: number;

        if (this.session.ended) {
            playheadFrames = Atomics.load(this.session.writtenIndex, 0);
        } else if (!this.userPaused && !this.session.waitingForData) {
            const elapsed = (Date.now() - this.playheadAnchorWall) / 1000;
            playheadFrames = this.playheadAnchorFrames + elapsed * out.sampleRate * out.channels;
        } else {
            playheadFrames = this.playheadAnchorFrames;
        }

        const currentTimeSeconds = this.toSeconds(out.channels, out.sampleRate, playheadFrames);

        const state: StateMessage = {
            currentTrack: this.session.path,
            currentTime: currentTimeSeconds,
            waitingForData: this.session.waitingForData,
            userPaused: this.userPaused,
            playbackRunning: !this.session.waitingForData && !this.userPaused,
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

    setFocused(focused: boolean) {
        this.focused = focused;
        if(this.focused) {
            this.registerAudioDevice();
        }
    }
}

const playerProcess = new PlayerProcess();

export interface IMsg<T> {
    type: string;
    payload: T;
}

interface LoadPayload {
    path: string;
    duration: number;
    pcmSab: SharedArrayBuffer;
    writtenSab: SharedArrayBuffer;
    sourceType: SourceType;
}

parentPort?.on("message", (msg: IMsg<unknown>) => {
    switch (msg.type) {
        case "get-init-device": {
            playerProcess.registerAudioDevice();
            if(!playerProcess.deviceInfo) return;
            parentPort?.postMessage({
                type: "device-info",
                payload: playerProcess.deviceInfo.out
            });
            break;
        }
        case "load": {
            const info = msg.payload as LoadPayload;
            playerProcess.load(info.path, info.duration, new Float32Array(info.pcmSab), new Int32Array(info.writtenSab), info.sourceType);
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
            break;
        }
        case "focus-update": {
            playerProcess.setFocused(msg.payload as boolean);
            break;
        }
    }
});
