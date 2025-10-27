import {parseBuffer} from "music-metadata";
import {Readable} from "node:stream";
import type {ReadableStream} from "node:stream/web";

export interface SeekPoint {
    sampleNumber: bigint;
    streamOffset: bigint;
    frameSamples: number;
}

export async function extractSampleRate(buf: Buffer) {
    const metadata = await parseBuffer(buf, "audio/flac", { duration: false });

    if (!metadata.format.sampleRate) {
        throw new Error("Could not determine sample rate");
    }

    return metadata.format.sampleRate;
}

export async function extractSeekTable(buf: Buffer) {

    if (buf.subarray(0, 4).toString("ascii") !== "fLaC") {
        throw new Error("Not a FLAC file");
    }

    let pos = 4;
    const seekpoints: SeekPoint[] = [];

    while (pos + 4 <= buf.length) {
        const header = buf.readUInt32BE(pos);
        const isLast = (header & 0x80000000) !== 0;
        const blockType = (header >> 24) & 0x7F;
        const length = header & 0xFFFFFF;
        pos += 4;

        if (blockType === 3) {
            const end = pos + length;
            while (pos + 18 <= end) {
                const sampleNumber = buf.readBigUInt64BE(pos);
                const streamOffset = buf.readBigUInt64BE(pos + 8);
                const frameSamples = buf.readUInt16BE(pos + 16);
                if (sampleNumber !== BigInt("0xFFFFFFFFFFFFFFFF")) {
                    seekpoints.push({ sampleNumber, streamOffset, frameSamples });
                }
                pos += 18;
            }
            break; // done
        } else {
            pos += length;
        }
        if (isLast) break;
    }
    return seekpoints;
}

export function findFlacAudioStart(buf: Buffer): number {
    if (buf.subarray(0, 4).toString("ascii") !== "fLaC")
        throw new Error("Not a FLAC file");

    let pos = 4;
    while (pos + 4 <= buf.length) {
        const header = buf.readUInt32BE(pos);
        const isLast = (header & 0x80000000) !== 0;
        const length = header & 0xFFFFFF;
        pos += 4 + length;
        if (isLast) return pos; // next byte = start of first frame
    }
    throw new Error("No end-of-metadata marker found");
}

export async function getFlacStream(header: Buffer, res: Response): Promise<Readable> {
    const bodyStream = Readable.fromWeb(res.body as ReadableStream<Uint8Array>);

    return Readable.from(async function* () {
        yield header;
        for await (const chunk of bodyStream) yield chunk;
    }());
}
