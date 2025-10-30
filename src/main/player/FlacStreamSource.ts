import {spawn} from "child_process";
import {ChildProcessByStdio} from "node:child_process";
import {Readable, Writable} from "node:stream";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import {BrowserWindow} from "electron";
import {SourceType} from "../../shared/PlayerState.js";
import {clearInterval} from "node:timers";
import {SEGMENT_DURATION} from "../../shared/TrackInfo.js";
import {extractSampleRate, extractSeekTable, findFlacAudioStart, getFlacStream, SeekPoint} from "./FlacHelper.js";
import {EventEmitter} from "node:events";

const ffmpegPath =
    process.env.NODE_ENV === "development"
        ? (typeof ffmpegStatic === "string" ? ffmpegStatic : ffmpegStatic.default)
        : path.join(process.resourcesPath, "ffmpeg", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");

export enum WaveformMode {
    LUFS
}

const DEBUG_LOG = false;

export class FLACStreamSource extends EventEmitter {
    private ffmpegProcess: ChildProcessByStdio<Writable, Readable, Readable> | null = null;
    private cancelled = false;
    private pcm: Float32Array;
    private numPeaks = 600;
    private waveformBuckets: Float32Array = new Float32Array(this.numPeaks);
    private readonly segmentMap: Uint8Array;
    private progressInterval: NodeJS.Timeout | null = null;
    private stoppingManually = false;
    private ffmpegExitPromise: Promise<void> | null = null;
    private ffmpegExitResolver: (() => void) | null = null;
    private ffmpegStartSec = 0;
    private ffmpegEndSec = 0;
    private totalBytes = 0n;
    private seekTable: SeekPoint[] = [];
    private originalSampleRate: number = 0;
    private firstPCMByteOffset = 0;
    private flacHeader: Buffer | null = null;
    private cleanupStarted = false;

    constructor(
        public url: string,
        public outputChannels = 2,
        public outputSampleRate = 44100,
        public duration = 0,
        public pcmSab: SharedArrayBuffer,
        private mainWindow: BrowserWindow,
        private sourceType: SourceType,
        private waveformMode: WaveformMode = WaveformMode.LUFS,
        segmentSab: SharedArrayBuffer
    ) {
        super();
        this.pcm = new Float32Array(pcmSab);
        this.segmentMap = new Uint8Array(segmentSab);
    }

    private getSegmentMapProgress(): number[] {
        return Array.from(this.segmentMap).map((_, i) => Atomics.load(this.segmentMap, i));
    }

    async start() {
        if (this.cancelled) return;

        this.mainWindow.webContents.send("player:event", {type: "loading-progress", progress: this.getSegmentMapProgress()});

        if(this.sourceType === "remote") {
            await this.prepareRemoteFlac();
        }

        void this.fillMissingSegments();
        this.startProgressUpdates();

        if (this.waveformMode === WaveformMode.LUFS && this.sourceType === "local") {
            void this.calculateLUFSWaveform().catch(err => {
                console.warn("LUFS waveform failed: ", err);
            });
        }
    }

    async prepareRemoteFlac() {
        const res = await fetch(this.url, { headers: { Range: "bytes=0-65535" } });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentRange = res.headers.get("content-range");
        if (!contentRange) throw new Error("Missing Content-Range header");

        this.totalBytes = BigInt(contentRange.split("/")[1]);

        const buf = Buffer.from(await res.arrayBuffer());
        this.originalSampleRate = await extractSampleRate(buf);
        this.seekTable = await extractSeekTable(buf);

        this.firstPCMByteOffset = findFlacAudioStart(buf);
        this.flacHeader = buf.subarray(0, this.firstPCMByteOffset);
    }

    async spawnFFmpeg(startSec: number, endSec: number) {
        if(DEBUG_LOG) console.log("NEW FFMPEG SPAWNED");

        this.ffmpegStartSec = startSec;
        this.ffmpegEndSec = endSec;

        let inputStream: Readable | null = null;
        let inputArg = this.url;
        let writeOffsetLocal: number;

        if (this.sourceType === "remote") {
            const targetStartSample = BigInt(Math.floor(startSec * this.originalSampleRate));
            const targetEndSample = BigInt(Math.floor(endSec * this.originalSampleRate));

            let startSeek = this.seekTable[0];
            for (const sp of this.seekTable) {
                if (sp.sampleNumber <= targetStartSample) startSeek = sp;
                else break;
            }

            const startByteAbsolute = startSeek.streamOffset + BigInt(this.firstPCMByteOffset);

            const endSeek = this.seekTable.find(sp => sp.sampleNumber >= targetEndSample);
            const endByteAbsolute = endSeek ? endSeek.streamOffset + BigInt(this.firstPCMByteOffset) - 1n : this.totalBytes - 1n;

            const res = await fetch(this.url, {
                headers: {
                    Range: `bytes=${startByteAbsolute}-${endByteAbsolute}`
                }
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            if (!res.body) throw new Error("No response body!");

            if (!this.flacHeader) {
                throw new Error("FLAC header not initialized");
            }

            inputStream = await getFlacStream(this.flacHeader, res);
            inputArg = "pipe:0";

            writeOffsetLocal = Number(startSeek.sampleNumber) * this.outputChannels;
        }

        const ffArgs: string[] = [];

        if (this.sourceType === "local") {
            ffArgs.push(
                "-ss", `${startSec}`,
                "-to", `${endSec}`
            );
        }

        ffArgs.push(
            "-i", inputArg,
            "-f", "f32le",
            "-acodec", "pcm_f32le",
            "-ac", `${this.outputChannels}`,
            "-ar", `${this.outputSampleRate}`,
            "pipe:1"
        );

        this.ffmpegProcess = spawn(ffmpegPath!, ffArgs, {stdio: ["pipe", "pipe", "pipe"]});

        this.ffmpegExitPromise = new Promise<void>((resolve) => {
            this.ffmpegExitResolver = resolve;
        });

        if (inputStream) inputStream.pipe(this.ffmpegProcess.stdin!);

        if (this.sourceType === "local") {
            writeOffsetLocal = Math.floor(startSec * this.outputSampleRate * this.outputChannels);
        }

        this.ffmpegProcess.stdout.on("data", (chunk: Buffer) => {
            if (!this.ffmpegProcess) return;

            const floatChunk = new Float32Array(chunk.buffer, chunk.byteOffset, chunk.byteLength / Float32Array.BYTES_PER_ELEMENT);
            const numFrames = floatChunk.length / this.outputChannels;

            const startFrame = Math.floor(writeOffsetLocal / this.outputChannels);
            const endFrame = startFrame + numFrames;

            this.markSegmentsInRange(startFrame, endFrame);

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

            if(DEBUG_LOG) console.log("FFMPEG EXITED");

            this.checkIfFullyLoaded();

            if (this.cancelled || manual) return;

            const endSeg = Math.floor(endSec / SEGMENT_DURATION);

            if (endSec >= this.duration - 0.05) {
                this.markLastSegmentLoaded();
                this.sendProgress();
                this.checkIfFullyLoaded();
                return;
            }

            setImmediate(() => this.fillMissingSegments(endSeg));
        });
    }

    private markSegmentsInRange(startFrame: number, endFrame: number) {
        const samplesPerSegment = Math.floor(this.outputSampleRate * SEGMENT_DURATION);
        const startSeg = Math.floor(startFrame / samplesPerSegment);
        const endSeg = Math.floor(endFrame / samplesPerSegment);

        for (let i = startSeg; i < endSeg && i < this.segmentMap.length; i++) {
            Atomics.store(this.segmentMap, i, 1);
        }
    }

    private markLastSegmentLoaded() {
        if (this.segmentMap.length > 0) {
            Atomics.store(this.segmentMap, this.segmentMap.length - 1, 1);
        }
    }

    private async cleanup(reason: string) {
        if(this.cleanupStarted) return;
        this.cleanupStarted = true;
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        await this.stopFFmpeg();
        if(DEBUG_LOG) console.log(`[FlacStreamSource] Cleaned up (${reason})`);
        this.cancelled = true;
    }

    cancel() {
        if (this.cancelled) return;
        this.cancelled = true;
        void this.cleanup("cancelled");
    }

    private checkIfFullyLoaded() {
        const allLoaded = Array.from(this.segmentMap).every((_, i) => Atomics.load(this.segmentMap, i) === 1);
        if (allLoaded && !this.ffmpegProcess) {
            this.sendProgress();
            void this.cleanup("finished");
        }
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

        if (this.ffmpegProcess) {
            if (startTime <= this.ffmpegStartSec || startTime >= this.ffmpegEndSec
                || Atomics.load(this.segmentMap, startSeg) === 0) {
                await this.stopFFmpeg();
                await this.spawnFFmpeg(startTime, endTime);
                return;
            }
        } else {
            await this.spawnFFmpeg(startTime, endTime);
        }
    }

    public async seek(timeSec: number) {
        if (this.cancelled) return;

        const targetSeg = Math.floor(timeSec / SEGMENT_DURATION);
        const totalSegments = this.segmentMap.length;

        const segToStart = Math.max(0, Math.min(targetSeg, totalSegments - 1));

        await this.fillMissingSegments(segToStart);
    }

    private sendProgress() {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

        const segmentProgress = this.getSegmentMapProgress();
        this.mainWindow.webContents.send("player:event", {type: "loading-progress", progress: segmentProgress});
    }

    private startProgressUpdates() {
        this.progressInterval = setInterval(() => {
            this.sendProgress();
        }, 200);
    }

    /** LUFS-based waveform (background process) */
    private async calculateLUFSWaveform() {
        this.waveformBuckets = new Float32Array(this.numPeaks);
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
                const skipFrames = Math.ceil(0.22 / 0.1);
                const trimmedValues = lufsValues.slice(skipFrames);
                for (let i = 0; i < this.numPeaks; i++) {
                    const idx = Math.floor((i / this.numPeaks) * trimmedValues.length);
                    let normalized = (trimmedValues[idx] - minLUFS) / (maxLUFS - minLUFS);
                    normalized = Math.min(Math.max(normalized, 0), 1);
                    normalized = Math.pow(normalized, 2);
                    this.waveformBuckets[i] = normalized;
                }

                const peaksToSend = this.waveformBuckets;
                if (this.mainWindow && !this.mainWindow.isDestroyed() && this.sourceType === "local") {
                    this.emit("waveform:data", {url: this.url, peaks: peaksToSend});
                }

                resolve();
            });
        });
    }
}
