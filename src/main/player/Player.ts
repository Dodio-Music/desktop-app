import {AudioIO, IoStreamWrite, SampleFormatFloat32} from "naudiodon";
import {PlayerState} from "../../shared/PlayerState.js";
import {PCMSource} from "./FLACStreamSource.js";
const BITDEPTH = 32;

type PlayerSession = {
    index: number;
    ai: IoStreamWrite;
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

            if (validPCM) {
                outputBuffer = this.applyVolume(outputBuffer, 1);
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
        });
    }

    async load(source: PCMSource, duration: number) {
        this.stop();

        this.userPaused = false;

        void source.start();

        const numberOfChannels = source.channels || 2;
        const sampleRate = source.sampleRate || 44100;
        this.trackDuration = duration;

        const ai = AudioIO({
            outOptions: {
                channelCount: numberOfChannels,
                sampleFormat: SampleFormatFloat32,
                sampleRate: sampleRate,
                deviceId: -1,
                closeOnError: false,
                maxQueue: 4
            }
        });

        ai.start();

        if (!ai) {
            throw new Error("Error while trying to create naudiodon instance!");
        }

        const bytesPerSample = BITDEPTH / 8;
        const framesPerBuffer = 1024 / 4; // TODO: have this be compatibility setting
        const chunkSize = framesPerBuffer * numberOfChannels * bytesPerSample;
        const silentChunk = Buffer.alloc(chunkSize);

        const session: PlayerSession = {
            index: this.count++,
            ai,
            numberOfChannels,
            sampleRate,
            readOffset: 0,
            cancelled: false,
            waitingForData: false,
            bufferSize: chunkSize,
            silentBuffer: silentChunk,
            pcmSource: source
        };
        this.session = session;

        this.chunkerLoopPromise = this.chunkerLoop(session);
    }

    pauseOrResume() {
        this.userPaused = !this.userPaused;
    }

    stop() {
        if (this.session) {
            this.session.cancelled = true;
            this.session.ai.emit("drain");
        }

        if (this.chunkerLoopPromise) {
            this.chunkerLoopPromise = null;
        }
    }

    toSeconds(numberOfChannels: number, sampleRate: number, timeInBytes: number) {
        const bytesPerSample = BITDEPTH / 8;
        const framesPlayed = timeInBytes / (bytesPerSample * numberOfChannels);
        return framesPlayed / sampleRate;
    }

    toBytes(numberOfChannels: number, sampleRate: number, timeInSeconds: number) {
        const bytesPerSample = BITDEPTH / 8;
        const framesPlayed = timeInSeconds * (bytesPerSample * numberOfChannels);
        return framesPlayed * sampleRate;
    }

    private notifyState() {
        if (!this.session) return;

        const currentTime = this.toSeconds(this.session.numberOfChannels, this.session.sampleRate, this.session.readOffset) ?? 0;

        this.onStateChange?.({
            currentTrack: this.currentPath,
            currentTime,
            waitingForData: this.session.waitingForData,
            userPaused: this.userPaused,
            duration: this.trackDuration
        });
    }

    applyVolume(buf: Buffer, volume: number): Buffer {
        for (let i = 0; i < buf.length; i += 4) {
            let sample = buf.readFloatLE(i);
            sample = Math.max(-1, Math.min(1, sample * volume));
            buf.writeFloatLE(sample, i);
        }
        return buf;
    }
}
