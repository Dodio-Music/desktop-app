import {AudioIO, getDevices, getHostAPIs, IoStreamWrite, SampleFormatFloat32} from "@underswing/naudiodon";
import {parentPort} from "node:worker_threads";
import {clearInterval} from "node:timers";
import {SourceType} from "../../shared/PlayerState.js";
import {activePreset} from "../../shared/latencyPresets.js";
import {SEGMENT_DURATION} from "../../shared/TrackInfo.js";

const IPC_UPDATE_INTERVAL = 200;
const IDLE_TIMEOUT_MS = 2 * 60 * 1000;

type PlayerSession = {
    path: string;
    readOffset: number;
    waitingForData: boolean;
    duration: number;
    pcm: Float32Array;
    segmentIndex: Uint8Array;
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

    private userVolume: number = 1;
    private volume: number = 1;
    private fadeToVolume = 1;
    private fadeFromVolume = 1;
    private fading: boolean = false;
    private fadeTotalSamples = 0;
    private fadeProgressSamples = 0;
    private playbackState: "paused" | "playing" | "fading-in" | "fading-out" = "paused";

    private stateLoopInterval: NodeJS.Timeout | null = null;

    private playheadAnchorFrames = 0;
    private playheadAnchorWall = Date.now();


    // === Audio Device Management (naudiodon) ===
    public registerAudioDevice(devInfo?: OutputDevice) {
        if (this.io && this.deviceInfo) return;

        if (!devInfo) {
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
                deviceId: devInfo.deviceId
            }
        };

        this.io = AudioIO({
            outOptions: {
                channelCount: this.deviceInfo.out.channels,
                sampleFormat: SampleFormatFloat32,
                sampleRate: this.deviceInfo.out.sampleRate,
                deviceId: this.deviceInfo.out.deviceId,
                closeOnError: false,
                maxQueue: activePreset.maxQueue,
                highwaterMark: 2048
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
        if (this.deviceInfo) this.deviceInfo.inactive = true;
        this.playbackState = "paused";
        if (this.chunkerLoopPromise) {
            await this.chunkerLoopPromise;
            this.chunkerLoopPromise = null;
        }
        this.io = null;
    }

    public async shutdown() {
        this.stopStateLoop();
        await this.suspendAudioDevice();
        this.deviceInfo = null;
        this.session = null;
        this.playbackState = "paused";

        parentPort?.close();
    }

    public setFocused(focused: boolean) {
        this.focused = focused;
        if (this.focused) {
            this.registerAudioDevice();
        }
    }


    // === Audio Processing ===
    private async chunkerLoop() {
        while (this.deviceInfo && this.io && !this.deviceInfo.inactive) {
            let outputBuf: Buffer = this.deviceInfo.silentBuffer;

            if (this.session && !this.isFullyPaused() && !this.session.ended) {
                const {readOffset, pcm, segmentIndex} = this.session;
                const segmentSize = this.samplesPerSegment();
                const startSegment = Math.floor(readOffset / segmentSize);
                const endSegment = Math.floor((readOffset + this.deviceInfo.samplesPerBuffer - 1) / segmentSize);

                let allSegmentsReady = true;
                for (let seg = startSegment; seg <= endSegment && seg < segmentIndex.length; seg++) {
                    if (Atomics.load(segmentIndex, seg) === 0) {
                        allSegmentsReady = false;
                        break;
                    }
                }

                if (allSegmentsReady) {
                    if (this.session.waitingForData) {
                        const queuedLatencyFrames = this.getQueuedLatencyFrames();
                        this.playheadAnchorFrames = readOffset - queuedLatencyFrames;
                        this.playheadAnchorWall = Date.now();
                    }

                    const end = Math.min(readOffset + this.deviceInfo.samplesPerBuffer, pcm.length);

                    if (readOffset >= pcm.length) {
                        this.session.ended = true;
                        this.session.readOffset = pcm.length;
                        this.notifyState();
                    }

                    const chunk = pcm.subarray(readOffset, end);

                    let volumeStart = 1;
                    let volumeEnd = 1;

                    if (this.fading) {
                        const total = this.fadeTotalSamples;
                        const progress = this.fadeProgressSamples;
                        const nextProgress = progress + this.deviceInfo.samplesPerBuffer;

                        const t0 = Math.min(1, progress / total);
                        const t1 = Math.min(1, nextProgress / total);

                        volumeStart = this.fadeFromVolume + t0 * (this.fadeToVolume - this.fadeFromVolume);
                        volumeEnd = this.fadeFromVolume + t1 * (this.fadeToVolume - this.fadeFromVolume);

                        this.fadeProgressSamples = nextProgress;

                        if (t1 >= 1) {
                            this.fading = false;
                            this.volume = this.fadeToVolume;

                            if (this.playbackState === "fading-out") {
                                this.playbackState = "paused";
                                this.updateAnchorForPause();
                            } else if(this.playbackState === "fading-in") {
                                this.playbackState = "playing";
                            }
                        }
                    }

                    outputBuf = this.applyVolumeWithFade(
                        Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength),
                        volumeStart,
                        volumeEnd
                    );

                    this.session.readOffset += this.deviceInfo.samplesPerBuffer;
                    this.session.waitingForData = false;
                } else {
                    this.session.waitingForData = true;
                    this.playheadAnchorFrames = this.session.readOffset;
                    this.playheadAnchorWall = Date.now();
                }
            }

            if (!this.isFullyPaused() || this.focused) {
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

    private applyVolumeWithFade(buf: Buffer, volumeStart: number, volumeEnd: number): Buffer {
        const out = Buffer.allocUnsafe(buf.length);
        const sampleCount = buf.length / 4;
        const userVolume = this.userVolume;

        for (let i = 0; i < sampleCount; i++) {
            const t = i / (sampleCount - 1);
            let volume = volumeStart + (1 - Math.cos(t * Math.PI)) / 2 * (volumeEnd - volumeStart);
            volume *= userVolume;
            let sample = buf.readFloatLE(i * 4);
            sample = Math.max(-1, Math.min(1, sample * volume));
            out.writeFloatLE(sample, i * 4);
        }

        return out;
    }


    // === Session Management ===
    public load(path: string, duration: number, pcm: Float32Array, segmentIndex: Uint8Array, sourceType: SourceType) {
        if (!this.deviceInfo) return;

        this.playbackState = "playing";

        this.session = {
            readOffset: 0,
            waitingForData: true,
            duration,
            path,
            pcm,
            segmentIndex,
            sourceType,
            ended: false
        };

        const queuedLatencyFrames = this.getQueuedLatencyFrames();
        this.playheadAnchorFrames = this.session.readOffset - queuedLatencyFrames;
        this.playheadAnchorWall = Date.now();

        this.notifyState();

        this.startStateLoop();
    }

    public seek(time: number) {
        if (!this.session || !this.deviceInfo) return;

        this.session.readOffset = this.toSampleIndex(this.deviceInfo.out.channels, this.deviceInfo.out.sampleRate, time);
        const queuedLatencyFrames = this.getQueuedLatencyFrames();
        this.playheadAnchorFrames = this.session.readOffset - queuedLatencyFrames;
        this.playheadAnchorWall = Date.now();

        this.notifyState();
    }

    private getQueuedLatencyFrames(): number {
        if (!this.deviceInfo) return 0;
        return this.deviceInfo.samplesPerBuffer * (activePreset.maxQueue + 1);
    }

    private updateAnchorForPause() {
        if(!this.deviceInfo) return;

        const {out} = this.deviceInfo;
        const now = Date.now();
        const elapsed = (now - this.playheadAnchorWall) / 1000;
        const advancedFrames = elapsed * out.sampleRate * out.channels;
        this.playheadAnchorFrames += advancedFrames;
        this.playheadAnchorWall = now;

        this.notifyState();
    }

    private updateAnchorForResume() {
        if(!this.session || !this.deviceInfo) return;
        const queuedLatencyFrames = this.getQueuedLatencyFrames();
        this.playheadAnchorFrames = this.session.readOffset - queuedLatencyFrames;
        this.playheadAnchorWall = Date.now();
    }

    private samplesPerSegment(): number {
        if (!this.deviceInfo) return 0;
        return Math.floor(this.deviceInfo.out.sampleRate * this.deviceInfo.out.channels * SEGMENT_DURATION);
    }


    // === Playback Control & State
    public pauseOrResume() {
        if(this.playbackState === "paused" || this.playbackState === "fading-out") {
            this.resume();
        } else if(this.playbackState === "playing" || this.playbackState === "fading-in") {
            this.pause();
        }

        this.notifyState();
    }

    private pause() {
        if (!this.deviceInfo || !this.session) return;

        if (this.playbackState === "playing" || this.playbackState === "fading-in") {
            this.playbackState = "fading-out";
            this.startFade(0);
        }
    }

    private resume() {
        if (this.playbackState === "paused" || this.playbackState === "fading-out") {
            this.playbackState = "fading-in";
            this.startFade(1);

            this.updateAnchorForResume();

            if (!this.io || !this.deviceInfo) {
                this.registerAudioDevice();
            }
        }
    }

    private startFade(target: number, duration = 0.15) {
        if (!this.deviceInfo) return;

        let currentVolume = this.volume;
        if (this.fading) {
            const t = this.fadeProgressSamples / this.fadeTotalSamples;
            currentVolume = this.fadeFromVolume + t * (this.fadeToVolume - this.fadeFromVolume);
        }

        this.fading = true;
        this.fadeProgressSamples = 0;
        this.fadeFromVolume = currentVolume;
        this.fadeToVolume = target;
        this.fadeTotalSamples = duration * this.deviceInfo.out.sampleRate * this.deviceInfo.out.channels;
    }

    public setVolume(slider: number) {
        this.userVolume = this.sliderToAmplitude(slider);
    }

    private isFullyPaused() {
        return this.playbackState === "paused";
    }

    private isPausingOrPaused() {
        return this.playbackState === "paused" || this.playbackState === "fading-out";
    }


    // === State Tracking & Communication ===
    private startStateLoop() {
        this.stopStateLoop();

        this.stateLoopInterval = setInterval(() => {
            if (!this.isFullyPaused()) this.notifyState();
        }, IPC_UPDATE_INTERVAL);
    }

    private stopStateLoop() {
        if (this.stateLoopInterval) {
            clearInterval(this.stateLoopInterval);
            this.stateLoopInterval = null;
        }
    }

    private notifyState() {
        if (!this.deviceInfo || !this.session) return;

        const {out} = this.deviceInfo;
        const queuedLatencyFrames = this.getQueuedLatencyFrames();
        const latencySeconds = this.toSeconds(out.channels, out.sampleRate, queuedLatencyFrames);

        let playheadFrames: number;

        if (this.session.ended) {
            playheadFrames = this.session.pcm.length;
        } else if (!this.isFullyPaused() && !this.session.waitingForData) {
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
            userPaused: this.isPausingOrPaused(),
            playbackRunning: !this.session.waitingForData && !this.isFullyPaused(),
            duration: this.session.duration,
            sourceType: this.session.sourceType,
            latency: latencySeconds
        };

        parentPort?.postMessage({type: "player-state", state});
    }


    // === Utility Methods ===
    private sliderToAmplitude(slider: number): number {
        slider = Math.max(0, Math.min(1, slider));
        if (slider <= 0) return 0;

        const minDb = -50;
        const maxDb = 0;
        const db = minDb + (maxDb - minDb) * slider;
        return Math.pow(10, db / 20);
    }

    private toSeconds(channels: number, sampleRate: number, timeInFrames: number) {
        const framesPlayed = timeInFrames / channels;
        return framesPlayed / sampleRate;
    }

    private toSampleIndex(channels: number, sampleRate: number, timeInSeconds: number) {
        const frameIndex = Math.floor(timeInSeconds * sampleRate);
        return frameIndex * channels;
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
    segmentSab: SharedArrayBuffer;
    sourceType: SourceType;
}

parentPort?.on("message", (msg: IMsg<unknown>) => {
    switch (msg.type) {
        case "get-init-device": {
            playerProcess.registerAudioDevice();
            if (!playerProcess.deviceInfo) return;
            parentPort?.postMessage({
                type: "device-info",
                payload: playerProcess.deviceInfo.out
            });
            break;
        }
        case "load": {
            const info = msg.payload as LoadPayload;
            playerProcess.load(info.path, info.duration, new Float32Array(info.pcmSab), new Uint8Array(info.segmentSab), info.sourceType);
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
