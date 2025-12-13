import {BrowserWindow} from "electron";
import {OutputDevice} from "../PlayerProcess.js";
import {SourceType} from "../../../shared/PlayerState.js";
import {BaseAudioSource, BaseAudioSourceInit} from "./BaseAudioSource.js";
import {SEGMENT_DURATION} from "../../../shared/TrackInfo.js";
import {
    parseFlacStreamInfo,
    readFileRange, SeekPoint
} from "./helper/FlacHelper.js";
import {LocalAudioSource} from "./LocalAudioSource.js";
import {RemoteFlacSource} from "./RemoteFlacSource.js";
import path from "path";
import {parseFile} from "music-metadata";
import {readFile} from "node:fs/promises";
import {detectOggCodec, getOggDuration} from "./helper/OpusHelper.js";

export interface FlacAudioMeta {
    type: "flac";
    totalSamples: number;
    sampleRate: number;
    flacHeader: Buffer;
    duration: number;
}

export interface RemoteFlacAudioMeta {
    type: "remote-flac";
    totalSamples: number;
    sampleRate: number;
    flacHeader: Buffer;
    totalBytes?: bigint;
    seekTable?: SeekPoint[];
    firstPCMByteOffset?: number;
    duration: number;
}

export interface GenericAudioMeta {
    type: "generic";
    duration: number;
}

export type AudioMeta = FlacAudioMeta | GenericAudioMeta | RemoteFlacAudioMeta;

export class AudioSourceFactory {
    static count: number = 0;

    static async create(
        id: string,
        pathOrUrl: string,
        sourceType: SourceType,
        generateWaveform: boolean,
        devInfo: OutputDevice,
        mainWindow: BrowserWindow
    ): Promise<{
        source: BaseAudioSource;
        pcmSab: SharedArrayBuffer;
        segmentSab: SharedArrayBuffer;
        duration: number;
    }> {
        const meta = await this.getMetadata(sourceType, pathOrUrl);

        let totalFloatSamples: number;

        // LOCAL GENERIC AUDIO
        if(meta.type === "generic") {
            totalFloatSamples = Math.ceil(meta.duration * devInfo.sampleRate) * devInfo.channels;
        }

        // LOCAL FLAC
        else if(meta.type === "flac") {
            const sampleRateConversion = devInfo.sampleRate / meta.sampleRate;
            totalFloatSamples = Math.ceil(
                meta.totalSamples * devInfo.channels * sampleRateConversion
            );
        }

        // REMOTE FLAC

        else {
            const sampleRateConversion = devInfo.sampleRate / meta.sampleRate;
            totalFloatSamples = Math.ceil(
                meta.totalSamples * devInfo.channels * sampleRateConversion
            );
        }

        const pcmSab = new SharedArrayBuffer(
            totalFloatSamples * Float32Array.BYTES_PER_ELEMENT
        );

        const totalSegments = Math.ceil(meta.duration / SEGMENT_DURATION);
        const segmentSab = new SharedArrayBuffer(totalSegments);

        const baseInit: BaseAudioSourceInit = {
            id,
            url: pathOrUrl,
            outputChannels: devInfo.channels,
            outputSampleRate: devInfo.sampleRate,
            duration: meta.duration,
            pcmSab,
            mainWindow,
            segmentSab,
            count: this.count,
            generateWaveform
        };

        let source: BaseAudioSource;
        if (sourceType === "local") {
            source = new LocalAudioSource(baseInit);
        } else {
            const flacMeta = meta as RemoteFlacAudioMeta;
            source = new RemoteFlacSource({
                ...baseInit,
                totalBytes: flacMeta.totalBytes!,
                seekTable: flacMeta.seekTable!,
                originalSampleRate: flacMeta.sampleRate!,
                firstPCMByteOffset: flacMeta.firstPCMByteOffset!,
                flacHeader: flacMeta.flacHeader
            });
        }

        this.count++;
        return {source, pcmSab, segmentSab, duration: meta.duration};
    }

    private static async getMetadata(sourceType: SourceType, pathOrUrl: string): Promise<AudioMeta> {
        if (sourceType === "local") {
            const ext = path.extname(pathOrUrl).toLowerCase();

            if(ext === ".flac") {
                const headerBuf = await readFileRange(pathOrUrl, 0, 65535);
                const {totalSamples, sampleRate} = parseFlacStreamInfo(headerBuf);
                const duration = totalSamples / sampleRate;

                return {
                    type: "flac",
                    totalSamples: Number(totalSamples),
                    sampleRate,
                    flacHeader: headerBuf,
                    duration
                };
            }

            if(ext === ".ogg" || ext === ".opus") {
                const buffer = await readFile(pathOrUrl);
                const codec = detectOggCodec(buffer);
                const duration = await getOggDuration(buffer, codec);

                return {type: "generic", duration};
            }

            const meta = await parseFile(pathOrUrl);
            const duration = meta.format.duration;
            if(!duration) throw new Error("Unable to read duration from file!");

            return {type: "generic", duration};
        }

        const meta = await RemoteFlacSource.prepareRemoteFlac(pathOrUrl);
        const {totalSamples, sampleRate} = parseFlacStreamInfo(meta.flacHeader);
        const duration = totalSamples / sampleRate;

        return {
            type: "remote-flac",
            totalSamples,
            sampleRate,
            flacHeader: meta.flacHeader,
            totalBytes: meta.totalBytes,
            seekTable: meta.seekTable,
            firstPCMByteOffset: meta.firstPCMByteOffset,
            duration
        };
    }
}
