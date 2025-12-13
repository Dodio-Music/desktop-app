import {BaseAudioSource, BaseAudioSourceInit} from "./BaseAudioSource.js";
import {extractSeekTable, findFlacAudioStart, getFlacStream, SeekPoint} from "./helper/FlacHelper.js";
import {spawn} from "child_process";

export interface RemoteFlacSourceInit extends BaseAudioSourceInit {
    totalBytes: bigint;
    seekTable: SeekPoint[];
    originalSampleRate: number;
    firstPCMByteOffset: number;
    flacHeader: Buffer;
}

export class RemoteFlacSource extends BaseAudioSource {
    private readonly totalBytes: bigint;
    private readonly seekTable: SeekPoint[];
    private readonly originalSampleRate: number;
    private readonly firstPCMByteOffset: number;
    private readonly flacHeader: Buffer;

    constructor(init: RemoteFlacSourceInit) {
        super(init);
        this.totalBytes = init.totalBytes;
        this.seekTable = init.seekTable;
        this.originalSampleRate = init.originalSampleRate;
        this.firstPCMByteOffset = init.firstPCMByteOffset;
        this.flacHeader = init.flacHeader;
    }

    public async start() {
        if (this.cancelled) return;

        this.mainWindow.webContents.send("player:event", {
            type: "loading-progress",
            progress: this.getSegmentMapProgress()
        });

        void this.fillMissingSegments();
        this.startProgressUpdates();
    }

    async spawnFFmpeg(startSec: number, endSec: number) {
        if (this.DEBUG_LOG) console.log(`[FlacStreamSource ${this.count}] NEW FFMPEG SPAWNED, START: ${startSec}, END: ${endSec}`);

        this.ffmpegStartSec = startSec;
        this.ffmpegEndSec = endSec;

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

        const inputStream = await getFlacStream(this.flacHeader, res);
        const inputArg = "pipe:0";

        const ffArgs: string[] = [];

        ffArgs.push(
            "-i", inputArg,
            "-f", "f32le",
            "-acodec", "pcm_f32le",
            "-ac", `${this.outputChannels}`,
            "-ar", `${this.outputSampleRate}`,
            "pipe:1"
        );

        this.ffmpegProcess = spawn(this.ffmpegPath!, ffArgs, {stdio: ["pipe", "pipe", "pipe"]});

        this.ffmpegExitPromise = new Promise<void>((resolve) => {
            this.ffmpegExitResolver = resolve;
        });

        inputStream.pipe(this.ffmpegProcess.stdin!);

        const writeOffset =
            Math.floor(Number(startSeek.sampleNumber) * this.outputSampleRate / this.originalSampleRate) * this.outputChannels;
        this.setupFfmpegLifecycle(endSec, writeOffset);
    }

    static async prepareRemoteFlac(url: string) {
        const res = await fetch(url, {headers: {Range: "bytes=0-65535"}});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const contentRange = res.headers.get("content-range");
        if (!contentRange) throw new Error("Missing Content-Range header");

        const totalBytes = BigInt(contentRange.split("/")[1]);
        const buf = Buffer.from(await res.arrayBuffer());
        const seekTable = await extractSeekTable(buf);
        const firstPCMByteOffset = findFlacAudioStart(buf);
        const flacHeader = buf.subarray(0, firstPCMByteOffset);

        return {totalBytes, seekTable, firstPCMByteOffset, flacHeader};
    }
}
