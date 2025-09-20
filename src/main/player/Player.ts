import {AudioIO, IoStreamWrite} from "naudiodon";
import ffmpeg from "ffmpeg-static";
import {Readable} from "node:stream";
import {ChildProcessByStdio} from "node:child_process";
import {PlayerState} from "../../shared/PlayerState.js";
import {PCMSource} from "./FLACStreamSource.js";
const ffmpegPath = typeof ffmpeg === "string" ? ffmpeg : (ffmpeg as unknown as { default: string }).default;

type PlayerSession = {
    index: number;
    ai: IoStreamWrite;
    bitDepth: 16 | 24 | 32;
    numberOfChannels: number;
    sampleRate: number;
    readOffset: number;
    cancelled: boolean;
    waitingForData: boolean;
    pcmSource: PCMSource;
    silentBuffer: Buffer;
    bufferSize: number;
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

    private async chunkerLoop(session: PlayerSession) {
        while (!session.cancelled) {
            const buffer = session.pcmSource.read(session.readOffset, session.bufferSize);
            const validPCM = buffer.length === session.bufferSize;
            session.waitingForData = !validPCM;

            let outputBuffer = this.userPaused || session.waitingForData ? session.silentBuffer : buffer;
            if (!this.userPaused && validPCM) session.readOffset += buffer.length;

            if(validPCM) {
                // quick fix: small headroom to avoid clipping
                outputBuffer = this.applyVolume(outputBuffer, 0.98, session.bitDepth);
            }

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

    async load(source: PCMSource, duration: number) {
        await this.stop();

        this.userPaused = false;

        void source.start();

        if (!ffmpegPath) {
            throw new Error("ffmpeg binary not found. Please check your system for compatibility!");
        }

        const numberOfChannels = source.channels || 2;
        const sampleRate = source.sampleRate || 44100;
        const bitDepth = source.bitDepth;
        this.trackDuration = duration;

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

        if (!ai) {
            throw new Error("Error while trying to create naudiodon instance!");
        }

        const bytesPerSample = bitDepth / 8;
        const framesPerBuffer = 1024 / 4; // TODO: have this be compatibility setting
        const chunkSize = framesPerBuffer * numberOfChannels * bytesPerSample;
        const silentChunk = Buffer.alloc(chunkSize);

        const session: PlayerSession = {
            index: this.count++,
            ai,
            bitDepth,
            numberOfChannels,
            sampleRate,
            readOffset: 0,
            cancelled: false,
            waitingForData: false,
            bufferSize: chunkSize,
            silentBuffer: silentChunk,
            pcmSource: source
        }
        this.session = session;

        this.chunkerLoopPromise = this.chunkerLoop(session);
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

    applyVolume(buf: Buffer, volume: number, bitDepth: 16 | 24 | 32): Buffer {
        switch (bitDepth) {
            case 16: {
                for (let i = 0; i < buf.length; i += 2) {
                    let sample = buf.readInt16LE(i);
                    sample = Math.max(-32768, Math.min(32767, Math.round(sample * volume)));
                    buf.writeInt16LE(sample, i);
                }
                break;
            }
            case 24: {
                for (let i = 0; i < buf.length; i += 3) {
                    let sample = buf[i] | (buf[i + 1] << 8) | (buf[i + 2] << 16);
                    if (sample & 0x800000) sample |= 0xff000000;
                    sample = Math.max(-8388608, Math.min(8388607, Math.round(sample * volume)));
                    buf[i] = sample & 0xff;
                    buf[i + 1] = (sample >> 8) & 0xff;
                    buf[i + 2] = (sample >> 16) & 0xff;
                }
                break;
            }
            case 32: {
                for (let i = 0; i < buf.length; i += 4) {
                    let sample = buf.readFloatLE(i);
                    sample = Math.max(-1, Math.min(1, sample * volume));
                    buf.writeFloatLE(sample, i);
                }
                break;
            }
        }
        return buf;
    }
}
