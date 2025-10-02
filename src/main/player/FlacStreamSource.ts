import {spawn} from "child_process";
import {ChildProcessByStdio} from "node:child_process";
import {Readable} from "node:stream";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import {BrowserWindow} from "electron";
import {SourceType} from "../../shared/PlayerState.js";

const ffmpegPath =
    process.env.NODE_ENV === "development"
        ? (typeof ffmpegStatic === "string" ? ffmpegStatic : ffmpegStatic.default)
        : path.join(process.resourcesPath, "ffmpeg", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");

export interface PCMSource {
    start(): Promise<void>;
    cancel(): void;
    append(chunk: Buffer): void;
    url: string;
    channels: number;
    sampleRate: number;
}

export class FLACStreamSource implements PCMSource {
    private ffmpegProcess: ChildProcessByStdio<null, Readable, null> | null = null;
    private cancelled = false;
    private writeOffset = 0;
    private pcm: Float32Array;
    private readonly writtenIndex: Int32Array;
    private numPeaks = 600;
    private waveformBuckets: Float32Array = new Float32Array(this.numPeaks);
    private currentBucketIndex = 0;
    private currentBucketOffset = 0;
    private bucketSize = 0;

    private initializeWaveformBuckets(durationSeconds: number) {
        const totalSamples = Math.ceil(durationSeconds * this.sampleRate);
        this.bucketSize = Math.ceil(totalSamples / this.numPeaks);
        this.waveformBuckets = new Float32Array(this.numPeaks);
        this.currentBucketIndex = 0;
        this.currentBucketOffset = 0;
    }

    public startWaveform(durationSeconds: number) {
        this.initializeWaveformBuckets(durationSeconds);
    }

    constructor(
        public url: string,
        public channels = 2,
        public sampleRate = 44100,
        public duration = 0,
        public pcmSab: SharedArrayBuffer,
        public writtenSab: SharedArrayBuffer,
        private mainWindow: BrowserWindow,
        private sourceType: SourceType
    ) {
        this.pcm = new Float32Array(pcmSab);
        this.writtenIndex = new Int32Array(writtenSab);
        this.startWaveform(duration);
    }

    async start() {
        if (this.cancelled) return;

        this.ffmpegProcess = spawn(ffmpegPath!, [
            "-i", this.url,
            "-f", "f32le",
            "-acodec", "pcm_f32le",
            "-ac", `${Math.max(this.channels, 2)}`,
            "-ar", `${this.sampleRate}`,
            "pipe:1"
        ], {stdio: ["ignore", "pipe", "ignore"]});

        this.ffmpegProcess.stdout.on("data", (chunk: Buffer) => {
            this.append(chunk);
        });

        this.ffmpegProcess.on("exit", () => {
            this.cancelled = true;

            const peaksToSend = this.waveformBuckets;
            if (this.mainWindow && !this.mainWindow.isDestroyed() && this.sourceType === "local") {
                this.mainWindow.webContents.send("waveform:data", peaksToSend);
            }
        });
    }

    append(chunk: Buffer) {
        const floatChunk = new Float32Array(chunk.buffer, chunk.byteOffset, chunk.byteLength / Float32Array.BYTES_PER_ELEMENT);

        this.pcm.set(floatChunk, this.writeOffset);
        this.writeOffset += floatChunk.length;
        Atomics.store(this.writtenIndex, 0, this.writeOffset);

        if(this.sourceType === "local") this.processChunkForWaveform(chunk);
    }

    cancel() {
        this.cancelled = true;
        this.ffmpegProcess?.kill("SIGKILL");
    }

    private processChunkForWaveform(chunk: Buffer) {
        if (!this.waveformBuckets) return;

        const floatData = new Float32Array(chunk.buffer, chunk.byteOffset, chunk.length / 4);

        for (let i = 0; i < floatData.length; i += this.channels) {
            if (this.currentBucketIndex >= this.numPeaks) break;

            let sample = 0;
            for (let c = 0; c < this.channels; c++) {
                sample = Math.max(sample, Math.abs(floatData[i + c]));
            }

            if (sample > this.waveformBuckets[this.currentBucketIndex]) {
                this.waveformBuckets[this.currentBucketIndex] = sample;
            }

            this.currentBucketOffset++;

            if (this.currentBucketOffset >= this.bucketSize) {
                this.currentBucketOffset = 0;
                this.currentBucketIndex++;
            }
        }
    }
}
