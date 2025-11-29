import {ChildProcessByStdio} from "node:child_process";
import {Readable, Writable} from "node:stream";
import {app, BrowserWindow} from "electron";
import {clearInterval} from "node:timers";
import {SEGMENT_DURATION} from "../../shared/TrackInfo.js";
import {EventEmitter} from "node:events";
import _ffmpegPath from "ffmpeg-static";
import path from "path";

const ffmpegRawPath = (typeof _ffmpegPath === "string") ? _ffmpegPath : _ffmpegPath.default ?? "";

export interface BaseAudioSourceInit {
    id: string;
    url: string;
    outputChannels: number;
    outputSampleRate: number;
    duration: number;
    pcmSab: SharedArrayBuffer;
    mainWindow: BrowserWindow;
    segmentSab: SharedArrayBuffer;
}

function resolveFfmpegPath() {
    if (!app.isPackaged) {
        return ffmpegRawPath;
    }

    const appPath = app.getAppPath();
    const unpackedPath = appPath.replace("app.asar", "app.asar.unpacked");
    const binaryRel = path.basename(ffmpegRawPath);
    const moduleRoot = path.dirname(require.resolve("ffmpeg-static"));
    const moduleRel = moduleRoot.split("node_modules").pop() ?? "";

    return path.join(
        unpackedPath,
        "node_modules",
        moduleRel,
        binaryRel
    );
}

export abstract class BaseAudioSource extends EventEmitter {
    public DEBUG_LOG = false;
    public ffmpegPath = resolveFfmpegPath();

    protected ffmpegProcess: ChildProcessByStdio<Writable, Readable, Readable> | null = null;
    protected cancelled = false;
    protected stoppingManually = false;
    protected ffmpegExitPromise: Promise<void> | null = null;
    protected ffmpegExitResolver: (() => void) | null = null;
    protected ffmpegStartSec = 0;
    protected ffmpegEndSec = 0;
    protected progressInterval: NodeJS.Timeout | null = null;
    protected cleanupStarted = false;

    protected pcm: Float32Array;
    protected segmentMap: Uint8Array;

    public readonly id: string;
    public readonly url: string;
    public readonly outputChannels: number;
    public readonly outputSampleRate: number;
    public readonly duration: number;
    protected mainWindow: BrowserWindow;

    constructor(init: BaseAudioSourceInit) {
        super();
        this.id = init.id;
        this.url = init.url;
        this.outputChannels = init.outputChannels;
        this.outputSampleRate = init.outputSampleRate;
        this.duration = init.duration;
        this.mainWindow = init.mainWindow;
        console.log(this.ffmpegPath);

        this.pcm = new Float32Array(init.pcmSab);
        this.segmentMap = new Uint8Array(init.segmentSab);
    }

    protected getSegmentMapProgress(): number[] {
        return Array.from(this.segmentMap).map((_, i) => Atomics.load(this.segmentMap, i));
    }

    protected markSegmentsInRange(startFrame: number, endFrame: number) {
        const samplesPerSegment = Math.floor(this.outputSampleRate * SEGMENT_DURATION);
        const startSeg = Math.floor(startFrame / samplesPerSegment);
        const endSeg = Math.floor(endFrame / samplesPerSegment);

        for (let i = startSeg; i < endSeg && i < this.segmentMap.length; i++) {
            Atomics.store(this.segmentMap, i, 1);
        }
    }

    protected sendProgress() {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

        const segmentProgress = this.getSegmentMapProgress();
        this.mainWindow.webContents.send("player:event", {type: "loading-progress", progress: segmentProgress});
    }

    protected startProgressUpdates() {
        this.progressInterval = setInterval(() => {
            this.sendProgress();
        }, 200);
    }

    protected markLastSegmentLoaded() {
        if (this.segmentMap.length > 0) {
            Atomics.store(this.segmentMap, this.segmentMap.length - 1, 1);
        }
    }

    protected async cleanup(reason: string) {
        if(this.cleanupStarted) return;
        this.cleanupStarted = true;
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        await this.stopFFmpeg();
        if(this.DEBUG_LOG) console.log(`[FlacStreamSource] Cleaned up (${reason})`);
        this.cancelled = true;
    }

    public cancel() {
        if (this.cancelled) return;
        void this.cleanup("cancelled");
    }

    protected checkIfFullyLoaded() {
        const allLoaded = Array.from(this.segmentMap).every((_, i) => Atomics.load(this.segmentMap, i) === 1);
        if (allLoaded && !this.ffmpegProcess) {
            this.sendProgress();
            void this.cleanup("finished");
        }
    }

    protected async stopFFmpeg() {
        if (!this.ffmpegProcess) return;
        this.stoppingManually = true;
        this.ffmpegProcess.stdin.destroy();
        this.ffmpegProcess.kill("SIGTERM");
        if (this.ffmpegExitPromise) await this.ffmpegExitPromise;
        this.ffmpegProcess = null;
        this.stoppingManually = false;
        this.ffmpegExitPromise = null;
        this.ffmpegExitResolver = null;
    }

    protected async fillMissingSegments(startSeg = 0) {
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

    protected setupFfmpegLifecycle(endSec: number, writeOffset: number) {
        if(!this.ffmpegProcess) throw new Error("No ffmpeg instance yet");

        this.ffmpegExitPromise = new Promise<void>((resolve) => {
            this.ffmpegExitResolver = resolve;
        });

        let writeOffsetLocal = writeOffset;

        this.ffmpegProcess.stdout.on("data", (chunk: Buffer) => {
            if (!this.ffmpegProcess) return;

            const floatChunk = new Float32Array(chunk.buffer, chunk.byteOffset, chunk.byteLength / Float32Array.BYTES_PER_ELEMENT);
            const numFrames = floatChunk.length / this.outputChannels;

            const startFrame = Math.floor(writeOffsetLocal / this.outputChannels);
            const endFrame = startFrame + numFrames;

            this.markSegmentsInRange(startFrame, endFrame);

            if (writeOffsetLocal + floatChunk.length > this.pcm.length) {
                const remaining = this.pcm.length - writeOffsetLocal;
                const overflow = (writeOffsetLocal + floatChunk.length) - this.pcm.length;
                if (remaining > 0) {
                    this.pcm.set(floatChunk.subarray(0, remaining), writeOffsetLocal);
                    writeOffsetLocal += remaining;
                }
                if(this.DEBUG_LOG) console.warn(`[FlacStreamSource] Clamped final write at ${writeOffsetLocal - remaining}/${this.pcm.length} samples (overflow of ${overflow} samples prevented)`);
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

            if(this.DEBUG_LOG) console.log("FFMPEG EXITED");

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

    abstract start(): Promise<void>;
    protected abstract spawnFFmpeg(startSec: number, endSec: number): Promise<void>;
}
