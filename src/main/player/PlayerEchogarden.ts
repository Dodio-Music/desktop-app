import {PlayerState} from "../../shared/PlayerState.js";
import {FLACStreamSource16Bit, PCMSource} from "./FLACStreamSource16Bit.js";
import {createAudioOutput} from "@echogarden/audio-io";

type PlayerSession = {
    index: number;
    audioOutput: Awaited<ReturnType<typeof createAudioOutput>> | null;
    numberOfChannels: number;
    sampleRate: number;
    readOffset: number;
    cancelled: boolean;
    waitingForData: boolean;
    pcmSource: PCMSource;
    silentBuffer: Int16Array;
    bufferSize: number;
};

export type TrackMetadata = {
    sampleRate: number;
    channels: number;
    duration: number;
}

export class PlayerEchogarden {
    private pendingChunks: Buffer[] = [];
    private session: PlayerSession | null = null;
    private count: number = 0;
    private volume: number = 1;

    onStateChange?: (state: PlayerState) => void;
    private userPaused = false;
    private trackDuration: number = 0;
    private currentPath: string | null = null;

    async load(meta: TrackMetadata) {
        this.stop();

        const numberOfChannels = meta.channels || 2;
        const sampleRate = meta.sampleRate || 44100;
        this.trackDuration = meta.duration;

        const bufferDurationMs = 100;
        const framesPerBuffer = Math.floor((sampleRate * bufferDurationMs) / 1000);
        const actualBufferDurationMs = (framesPerBuffer / sampleRate) * 1000;
        const bufferSize = framesPerBuffer * numberOfChannels;
        const silentBuffer = new Int16Array(bufferSize);

        const pcmSource = new FLACStreamSource16Bit();

        for (const chunk of this.pendingChunks) pcmSource.append(chunk);
        this.pendingChunks = [];

        const session: PlayerSession = {
            index: this.count++,
            audioOutput: null,
            numberOfChannels,
            sampleRate,
            readOffset: 0,
            cancelled: false,
            waitingForData: false,
            bufferSize,
            silentBuffer,
            pcmSource
        };
        this.session = session;

        session.audioOutput = await createAudioOutput({
            sampleRate,
            channelCount: numberOfChannels,
            bufferDuration: actualBufferDurationMs
        }, (outputBuffer: Int16Array) => {
            this.audioCallback(session, outputBuffer);
        });
        this.userPaused = false;
    }

    private audioCallback(session: PlayerSession, outputBuffer: Int16Array) {
        if(session.cancelled) return;

        const bytesPerSecond = session.sampleRate * session.numberOfChannels * 2;
        const prefetchBytes = Math.floor(bytesPerSecond * 0.5);

        const bytesPerSample = 16 / 8;
        const samplesNeeded = outputBuffer.length;
        const bytesNeeded = samplesNeeded * bytesPerSample;

        const buffer = session.pcmSource.read(session.readOffset, bytesNeeded);
        const validPCM = buffer.length === bytesNeeded;
        session.waitingForData = !validPCM;

        let writeBuffer: Int16Array;

        const enoughData = session.pcmSource.size() - session.readOffset >= prefetchBytes;
        if(!enoughData) {
            session.waitingForData = true;
        }

        if (this.userPaused || session.waitingForData) {
            writeBuffer = session.silentBuffer;
        } else {
            writeBuffer = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
        }

        if (!this.userPaused && validPCM && !session.waitingForData) {
            session.readOffset += buffer.length;
        }

        for (let i = 0; i < writeBuffer.length; i++) {
            outputBuffer[i] = Math.floor(writeBuffer[i] * this.volume);
        }

        this.notifyState();
    }

    pauseOrResume() {
        this.userPaused = !this.userPaused;
    }

    stop() {
        if (this.session) {
            this.session.cancelled = true;
            this.session.audioOutput?.dispose();
            this.session = null;
        }
    }

    changeVolume(slider: number) {
        slider = Math.max(0, Math.min(1, slider));

        const minDb = -40;
        const maxDb = 0;

        const db = minDb + (maxDb - minDb) * slider;

        this.volume = Math.pow(10, db / 20);
    }

    toSeconds(numberOfChannels: number, sampleRate: number, timeInBytes: number) {
        const bytesPerSample = 16 / 8;
        const framesPlayed = timeInBytes / (bytesPerSample * numberOfChannels);
        return framesPlayed / sampleRate;
    }

    toBytes(numberOfChannels: number, sampleRate: number, timeInSeconds: number) {
        const bytesPerSample = 16 / 8;
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

    append(chunk: Buffer) {
        if (this.session?.pcmSource) {
            this.session.pcmSource.append(chunk);
        } else {
            this.pendingChunks.push(chunk);
        }
    }
}
