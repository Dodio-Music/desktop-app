import {spawn} from "child_process";
import {ChildProcessByStdio} from "node:child_process";
import {Readable} from "node:stream";
import ffmpeg from "ffmpeg-static";
const ffmpegPath = typeof ffmpeg === "string" ? ffmpeg : (ffmpeg as unknown as { default: string }).default;

export interface PCMSource {
    read(offset: number, length: number): Buffer;
    start(): Promise<void>;
    cancel(): void;
    size(): number;
    append(chunk: Buffer): void;
    url: string;
    channels: number;
    sampleRate: number;
}

export class FLACStreamSource implements PCMSource {
    private buffers: Buffer[] = [];
    private length = 0;
    private ffmpegProcess: ChildProcessByStdio<null, Readable, null> | null = null;
    private cancelled = false;

    constructor(
        public url: string,
        public channels = 2,
        public sampleRate = 44100
    ) {}

    async start() {
        if(this.cancelled) return;

        this.ffmpegProcess = spawn(ffmpegPath, [
            "-i", this.url,
            "-f", "f32le",
            "-acodec", "pcm_f32le",
            "-ac", `${this.channels}`,
            "-ar", `${this.sampleRate}`,
            "pipe:1"
        ], {stdio: ["ignore", "pipe", "ignore"]});

        this.ffmpegProcess.stdout.on("data", (chunk: Buffer) => {
            this.append(chunk);
        });

        this.ffmpegProcess.on("exit", () => {
            this.cancelled = true;
        });
    }

    append(chunk: Buffer) {
        this.buffers.push(chunk);
        this.length += chunk.length;
    }

    read(offset: number, length: number): Buffer {
        if (offset >= this.length) return Buffer.alloc(0);

        const out = Buffer.alloc(Math.min(length, this.length - offset));
        let copied = 0;
        let remaining = out.length;
        let pos = 0;

        for (const buffer of this.buffers) {
            if (offset >= pos + buffer.length) {
                pos += buffer.length;
                continue;
            }

            const start = Math.max(0, offset - pos);
            const toCopy = Math.min(buffer.length - start, remaining);
            buffer.copy(out, copied, start, start + toCopy);

            copied += toCopy;
            remaining -= toCopy;
            pos += buffer.length;

            if (remaining <= 0) break;
        }

        return out;
    }

    size() {
        return this.length;
    }

    cancel() {
        this.cancelled = true;
        this.ffmpegProcess?.kill("SIGKILL");
    }
}
