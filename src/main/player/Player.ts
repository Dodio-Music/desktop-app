import {AudioIO, IoStreamWrite} from "naudiodon";
import {parseFile} from "music-metadata";
import {spawn} from "child_process";
import ffmpegPath from "ffmpeg-static";
import {Readable} from "node:stream";
import {ChildProcessByStdio} from "node:child_process";
import {PCMStore} from "./PCMStore.js";
import {PlayerState} from "../../shared/PlayerState.js";

type PlayerSession = {
    index: number;
    ai: IoStreamWrite;
    pcmStore: PCMStore;
    bitDepth: 16 | 24 | 32;
    numberOfChannels: number;
    sampleRate: number;
    readOffset: number;
    cancelled: boolean;
    waitingForData: boolean;
};

export class Player {
    private session: PlayerSession | null = null;
    private ffmpeg: ChildProcessByStdio<null, Readable, null> | null = null;
    private count: number = 0;

    onStateChange?: (state: PlayerState) => void;
    private userPaused = false;
    private trackDuration: number = 0;
    private currentPath: string | null = null;
    private chunkerLoopPromise: Promise<void> | null = null;

    private async chunkerLoop(session: PlayerSession, silentBuffer: Buffer, bufferSize: number) {
        while (!session.cancelled) {
            const buffer = session.pcmStore.read(session.readOffset, bufferSize);
            const validPCM = buffer.length === bufferSize;
            session.waitingForData = !validPCM;

            const outputBuffer = this.userPaused || session.waitingForData ? silentBuffer : buffer;
            if (!this.userPaused && validPCM) session.readOffset += buffer.length;

            if (!session.ai.write(outputBuffer)) {
                await new Promise<void>((resolve) => {
                    const onDrain = () => {
                        session.ai.removeListener("drain", onDrain);
                        resolve();
                    };
                    session.ai.once("drain", onDrain);
                });
            }
            this.notifyState();
        }
        await new Promise<void>(resolve => {
            session.ai.quit(() => {
                resolve();
            });
        })
    }

    async load(filePath: string) {
        await this.stop();

        const metadata = await parseFile(filePath);

        if (!ffmpegPath) {
            throw new Error("ffmpeg binary not found. Please check your system for compatibility!");
        }

        const numberOfChannels = metadata.format.numberOfChannels || 2;
        const sampleRate = metadata.format.sampleRate || 44100;
        const bitDepth = this.formatMatch(metadata.format.bitsPerSample || 16);
        this.trackDuration = metadata.format.duration ?? 0;
        this.currentPath = filePath;

        const pcmStore = new PCMStore();

        this.ffmpeg = spawn(ffmpegPath, [
            "-i", filePath,
            "-f", `s${bitDepth}le`,
            "-acodec", `pcm_s${bitDepth}le`,
            "-ac", `${numberOfChannels}`,
            "-ar", `${sampleRate}`,
            "pipe:1"
        ], {stdio: ["ignore", "pipe", "ignore"]});

        this.ffmpeg.stdout.on("data", (chunk: Buffer) => {
            pcmStore.append(chunk);
        });

        if (!this.ffmpeg) {
            throw new Error("Error while trying to create ffmpeg instance!");
        }

        const ai = AudioIO({
            outOptions: {
                channelCount: numberOfChannels,
                sampleFormat: bitDepth,
                sampleRate: sampleRate,
                deviceId: -1,
                closeOnError: false,
                maxQueue: 8
            }
        });

        ai.start();

        const session: PlayerSession = {
            index: this.count++,
            ai,
            pcmStore,
            bitDepth,
            numberOfChannels,
            sampleRate,
            readOffset: 0,
            cancelled: false,
            waitingForData: false
        }
        this.session = session;

        if (!ai) {
            throw new Error("Error while trying to create naudiodon instance!");
        }

        const bytesPerSample = bitDepth / 8;
        const framesPerBuffer = 1024 / 4; // TODO: have this be compatibility setting
        const chunkSize = framesPerBuffer * numberOfChannels * bytesPerSample;
        const silentChunk = Buffer.alloc(chunkSize);

        this.chunkerLoopPromise = this.chunkerLoop(session, silentChunk, chunkSize);
    }

    formatMatch(bitDepth: number) {
        const allowed = [16, 24, 32];

        let match = allowed[0];
        for (const val of allowed) {
            if (bitDepth >= val) {
                match = val;
            } else {
                break;
            }
        }
        return match as 16 | 24 | 32;
    }

    pauseOrResume() {
        this.userPaused = !this.userPaused;
    }

    async stop() {
        if (this.ffmpeg) {
            this.ffmpeg.kill("SIGKILL");
            this.ffmpeg = null;
        }

        if(this.session) {
            this.session.cancelled = true;
            this.session.ai.emit('drain');
        }

        if (this.chunkerLoopPromise) {
            await this.chunkerLoopPromise;
            this.chunkerLoopPromise = null;
        }
    }

    toSeconds(bitDepth: number, numberOfChannels: number, sampleRate: number, timeInBytes: number) {
        const bytesPerSample = bitDepth / 8;
        const framesPlayed = timeInBytes / (bytesPerSample * numberOfChannels);
        return framesPlayed / sampleRate;
    }

    private notifyState() {
        if(!this.session) return;

        const currentTime = this.toSeconds(this.session.bitDepth, this.session.numberOfChannels, this.session.sampleRate, this.session.readOffset) ?? 0;

        this.onStateChange?.({
            currentTrack: this.currentPath,
            currentTime,
            waitingForData: this.session.waitingForData,
            userPaused: this.userPaused,
            duration: this.trackDuration
        });
    }
}
