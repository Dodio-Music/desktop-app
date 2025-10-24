import {spawn} from "child_process";
import {ChildProcessByStdio} from "node:child_process";
import {Readable, Writable} from "node:stream";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import {BrowserWindow} from "electron";
import {SourceType} from "../../shared/PlayerState.js";
import type {ReadableStream} from "node:stream/web";
import {clearInterval} from "node:timers";

const ffmpegPath =
    process.env.NODE_ENV === "development"
        ? (typeof ffmpegStatic === "string" ? ffmpegStatic : ffmpegStatic.default)
        : path.join(process.resourcesPath, "ffmpeg", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");

export enum WaveformMode {
    RMS, LUFS
}

export const SEGMENT_DURATION = 1;

export class FLACStreamSource {
    private ffmpegProcess: ChildProcessByStdio<Writable, Readable, null> | null = null;
    private cancelled = false;
    private pcm: Float32Array;
    private numPeaks = 600;
    private waveformBuckets: Float32Array = new Float32Array(this.numPeaks);
    private currentBucketIndex = 0;
    private currentBucketOffset = 0;
    private bucketSize = 0;
    private segmentMap: Uint8Array;
    private progressInterval: NodeJS.Timeout | null = null;
    private stoppingManually = false;
    private ffmpegExitPromise: Promise<void> | null = null;
    private ffmpegExitResolver: (() => void) | null = null;
    private ffmpegStartSec = 0;
    private ffmpegEndSec = 0;

    // private lufsPromise: Promise<void> | null = null;

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
        private mainWindow: BrowserWindow,
        private sourceType: SourceType,
        private waveformMode: WaveformMode = WaveformMode.LUFS,
        segmentSab: SharedArrayBuffer
    ) {
        this.pcm = new Float32Array(pcmSab);
        this.segmentMap = new Uint8Array(segmentSab);
        this.startWaveform(duration);
    }

    private getSegmentMapProgress(): number[] {
        return Array.from(this.segmentMap).map((_, i) => Atomics.load(this.segmentMap, i));
    }

    async start() {
        if (this.cancelled) return;
        this.fillMissingSegments();
        this.startProgressUpdates();
    }

    private startProgressUpdates() {
        if (this.progressInterval) clearInterval(this.progressInterval);
        this.progressInterval = setInterval(() => {
            if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
            const progress = Array.from(this.segmentMap).map((_, i) => Atomics.load(this.segmentMap, i));
            this.mainWindow.webContents.send("player:loading-progress", progress);
        }, 100);
    }

    // if (this.waveformMode === WaveformMode.LUFS && this.sourceType === "local") {
    //     this.lufsPromise = this.calculateLUFSWaveform();
    // }

    async spawnFFmpeg(startSec: number, endSec: number) {
        if (this.cancelled) return;

        console.log("NEW FFMPEG SPAWNED");

        this.ffmpegStartSec = startSec;
        this.ffmpegEndSec = endSec;

        //let inputStream: Readable | null = null;
        let inputArg = this.url;

        /*if (this.sourceType === "remote") {
            const res = await fetch(this.url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            if (!res.body) throw new Error("No response body!");

            inputStream = Readable.fromWeb(res.body as ReadableStream<Uint8Array>);
            inputArg = "pipe:0";
        }*/

        this.ffmpegProcess = spawn(ffmpegPath!, [
            "-re",
            "-ss", `${startSec}`,
            "-to", `${endSec}`,
            "-i", inputArg,
            "-f", "f32le",
            "-acodec", "pcm_f32le",
            "-ac", `${this.channels}`,
            "-ar", `${this.sampleRate}`,
            "pipe:1"
        ], {stdio: ["pipe", "pipe", "ignore"]});

        this.ffmpegExitPromise = new Promise<void>((resolve) => {
            this.ffmpegExitResolver = resolve;
        });

        //if (inputStream) inputStream.pipe(ffmpegProcess.stdin!);

        let writeOffsetLocal = Math.floor(startSec * this.sampleRate * this.channels);

        this.ffmpegProcess.stdout.on("data", (chunk: Buffer) => {
            if (this.cancelled) {
                this.ffmpegProcess!.kill("SIGTERM");
                return;
            }

            const floatChunk = new Float32Array(chunk.buffer, chunk.byteOffset, chunk.byteLength / Float32Array.BYTES_PER_ELEMENT);

            if (writeOffsetLocal + floatChunk.length > this.pcm.length) {
                const remaining = this.pcm.length - writeOffsetLocal;
                if (remaining > 0) {
                    this.pcm.set(floatChunk.subarray(0, remaining), writeOffsetLocal);
                    writeOffsetLocal += remaining;
                }
                console.warn(`[FlacStreamSource] Clamped final write at ${writeOffsetLocal}/${this.pcm.length} samples (overflow prevented)`);
                return;
            }

            this.pcm.set(floatChunk, writeOffsetLocal);
            writeOffsetLocal += floatChunk.length;

            const startFrame = Math.floor(writeOffsetLocal / this.channels);
            const endFrame = Math.floor((writeOffsetLocal + floatChunk.length) / this.channels);
            this.markSegmentsInRange(startFrame, endFrame);
        });

        this.ffmpegProcess.on("exit", () => {
            if (this.ffmpegExitResolver) {
                this.ffmpegExitResolver();
                this.ffmpegExitResolver = null;
                this.ffmpegExitPromise = null;
            }

            const manual = this.stoppingManually;
            this.ffmpegProcess = null;
            this.stoppingManually = false;

            console.log("FFMPEG EXITED");

            if (this.cancelled || manual) return;

            const endSeg = Math.floor(endSec / SEGMENT_DURATION);

            if (endSec >= this.duration - 0.001) {
                console.log("Marking final segment as loaded");
                this.markLastSegmentLoaded();
                this.sendProgress();
                return;
            }

            setImmediate(() => this.fillMissingSegments(endSeg));
        });
    }

    private sendProgress() {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

        const segmentProgress = this.getSegmentMapProgress();
        this.mainWindow.webContents.send("player:loading-progress", segmentProgress);
    }

    private markSegmentsInRange(startFrame: number, endFrame: number) {
        const samplesPerSegment = Math.floor(this.sampleRate * SEGMENT_DURATION);
        const startSeg = Math.floor(startFrame / samplesPerSegment);
        const endSeg = Math.floor((endFrame - 1) / samplesPerSegment);

        for (let i = startSeg; i < endSeg && i < this.segmentMap.length; i++) {
            Atomics.store(this.segmentMap, i, 1);
        }
    }

    private markLastSegmentLoaded() {
        if (this.segmentMap.length > 0) {
            Atomics.store(this.segmentMap, this.segmentMap.length - 1, 1);
        }
    }

    cancel() {
        this.cancelled = true;
        this.stopFFmpeg();
    }

    private async stopFFmpeg() {
        if (!this.ffmpegProcess) return;
        this.stoppingManually = true;
        this.ffmpegProcess.stdin.destroy();
        this.ffmpegProcess.kill("SIGTERM");
        const promise = this.ffmpegExitPromise;
        if (promise) {
            await promise;
        }

        this.ffmpegProcess = null;
        this.stoppingManually = false;
        this.ffmpegExitPromise = null;
        this.ffmpegExitResolver = null;
    }

    private async fillMissingSegments(startSeg = 0) {
        if (this.cancelled) return;

        const totalSegments = this.segmentMap.length;
        let seg = startSeg;

        while (seg < totalSegments && Atomics.load(this.segmentMap, seg) === 1) {
            seg++;
        }

        if (seg >= totalSegments) return;
        // go to start optional improvement

        const startTime = seg * SEGMENT_DURATION;

        let endSeg = seg + 1;
        while (endSeg < totalSegments && Atomics.load(this.segmentMap, endSeg) === 0) {
            endSeg++;
        }
        const endTime = Math.min(endSeg * SEGMENT_DURATION, this.duration);

        console.log("new times: " + startTime + " - " + endTime);
        console.log("active process: " + this.ffmpegStartSec + " - " + this.ffmpegEndSec)

        if (this.ffmpegProcess) {
            if (startTime <= this.ffmpegStartSec || startTime >= this.ffmpegEndSec
                || Atomics.load(this.segmentMap, startSeg) === 0) {
                console.log("Stopping old FFmpeg to cover new range");
                await this.stopFFmpeg();
                await this.spawnFFmpeg(startTime, endTime);
                return;
            }
        } else {
            await this.spawnFFmpeg(startTime, endTime);
        }

        // start new process ifs
        //if 1 -> startTime is NOT IN RANGE (this.ffmpegStart/End)
        // ||
        //if 2 -> point of startTime is not loaded

        console.log("Existing FFmpeg already covers start - returning");
    }

    public async seek(timeSec: number) {
        if (this.cancelled) return;

        const targetSeg = Math.floor(timeSec / SEGMENT_DURATION);
        const totalSegments = this.segmentMap.length;

        const segToStart = Math.max(0, Math.min(targetSeg, totalSegments - 1));

        await this.fillMissingSegments(segToStart);
    }


    /** LUFS-based waveform (background process) */
    private async calculateLUFSWaveform() {
        return new Promise<void>((resolve, reject) => {
            const lufsProcess = spawn(ffmpegPath!, [
                "-i", this.url,
                "-filter_complex", "ebur128",
                "-f", "null", "-"
            ], {stdio: ["pipe", "pipe", "pipe"]});

            let buffer = "";
            lufsProcess.stderr.setEncoding("utf-8");

            lufsProcess.stderr.on("data", (data) => buffer += data);

            lufsProcess.on("exit", () => {
                const lines = buffer.split(/\r?\n/);
                const lufsValues: number[] = [];

                for (const line of lines) {
                    const match = line.match(/M:\s*(-?\d+(\.\d+)?)/); // momentary loudness
                    if (match) {
                        const val = parseFloat(match[1]);
                        lufsValues.push(val);
                    }
                }

                if (lufsValues.length === 0) {
                    return reject(new Error("No LUFS data found"));
                }

                const maxLUFS = Math.max(...lufsValues);
                const minLUFS = Math.max(maxLUFS - 20, -40);
                for (let i = 0; i < this.numPeaks; i++) {
                    const idx = Math.floor((i / this.numPeaks) * lufsValues.length);
                    let normalized = (lufsValues[idx] - minLUFS) / (maxLUFS - minLUFS);
                    normalized = Math.min(Math.max(normalized, 0), 1);
                    normalized = Math.pow(normalized, 2);
                    this.waveformBuckets[i] = normalized;
                }

                resolve();
            });
        });
    }

    /** RMS peak-based waveform (during decoding) */
    private processChunkForWaveform(chunk: Buffer) {
        if (!this.waveformBuckets) return;

        const floatData = new Float32Array(chunk.buffer, chunk.byteOffset, chunk.length / 4);

        for (let i = 0; i < floatData.length; i += this.channels) {
            if (this.currentBucketIndex >= this.numPeaks) break;

            let sumSquares = 0;
            for (let c = 0; c < this.channels; c++) {
                sumSquares += floatData[i + c] ** 2;
            }

            const rms = Math.sqrt(sumSquares / this.channels);

            if (rms > this.waveformBuckets[this.currentBucketIndex]) {
                this.waveformBuckets[this.currentBucketIndex] = rms;
            }

            this.currentBucketOffset++;

            if (this.currentBucketOffset >= this.bucketSize) {
                this.currentBucketOffset = 0;
                this.currentBucketIndex++;
            }
        }
    }
}
