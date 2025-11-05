import {BrowserWindow} from "electron";
import {OutputDevice} from "./PlayerProcess.js";
import {SourceType} from "../../shared/PlayerState.js";
import {BaseAudioSource, BaseAudioSourceInit} from "./BaseAudioSource.js";
import {SEGMENT_DURATION} from "../../shared/TrackInfo.js";
import {
    parseFlacStreamInfo,
    readFileRange, SeekPoint
} from "./FlacHelper.js";
import {LocalAudioSource} from "./LocalAudioSource.js";
import {RemoteFlacSource} from "./RemoteFlacSource.js";

export interface AudioMeta {
    totalSamples: number;
    sampleRate: number;
    flacHeader: Buffer;
    totalBytes?: bigint;
    seekTable?: SeekPoint[];
    firstPCMByteOffset?: number;
}

export class AudioSourceFactory {
    static async create(
        id: string,
        pathOrUrl: string,
        sourceType: SourceType,
        devInfo: OutputDevice,
        mainWindow: BrowserWindow): Promise<{
        source: BaseAudioSource;
        pcmSab: SharedArrayBuffer;
        segmentSab: SharedArrayBuffer;
        duration: number;
    }> {
        const meta = await this.getMetadata(sourceType, pathOrUrl);

        const sampleRate = meta.sampleRate;
        const sampleRateConversion = devInfo.sampleRate / sampleRate;
        const totalFloatSamples = Math.ceil(meta.totalSamples * devInfo.channels * sampleRateConversion);

        const pcmSab = new SharedArrayBuffer(totalFloatSamples * Float32Array.BYTES_PER_ELEMENT);
        const totalSegments = Math.ceil(meta.totalSamples / (sampleRate * SEGMENT_DURATION));
        const segmentSab = new SharedArrayBuffer(totalSegments);

        const baseInit: BaseAudioSourceInit = {
            id,
            url: pathOrUrl,
            outputChannels: devInfo.channels,
            outputSampleRate: devInfo.sampleRate,
            duration: meta.totalSamples / sampleRate,
            pcmSab,
            mainWindow,
            segmentSab
        };

        let source: BaseAudioSource;
        if (sourceType === "local") {
            source = new LocalAudioSource(baseInit);
        } else {
            source = new RemoteFlacSource({
                ...baseInit,
                totalBytes: meta.totalBytes!,
                seekTable: meta.seekTable!,
                originalSampleRate: sampleRate!,
                firstPCMByteOffset: meta.firstPCMByteOffset!,
                flacHeader: meta.flacHeader
            });
        }

        return {source, pcmSab, segmentSab, duration: meta.totalSamples / sampleRate};
    }

    private static async getMetadata(sourceType: SourceType, pathOrUrl: string): Promise<AudioMeta> {
        if (sourceType === "local") {
            const headerBuf = await readFileRange(pathOrUrl, 0, 65535);
            const {totalSamples, sampleRate} = parseFlacStreamInfo(headerBuf);
            return {totalSamples: Number(totalSamples), sampleRate, flacHeader: headerBuf};
        }

        const meta = await RemoteFlacSource.prepareRemoteFlac(pathOrUrl);
        const {totalSamples, sampleRate} = parseFlacStreamInfo(meta.flacHeader);
        return {
            totalSamples,
            sampleRate,
            flacHeader: meta.flacHeader,
            totalBytes: meta.totalBytes,
            seekTable: meta.seekTable,
            firstPCMByteOffset: meta.firstPCMByteOffset
        };
    }
}
