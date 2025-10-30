import {parseBuffer} from "music-metadata";
import {Readable} from "node:stream";
import type {ReadableStream} from "node:stream/web";
import {open} from "fs/promises";

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

export function parseFlacStreamInfo(buffer: Buffer): { totalSamples: number; sampleRate: number } {
    const marker = buffer.toString('ascii', 0, 4);
    if (marker !== 'fLaC') {
        throw new Error("Not a valid FLAC file. 'fLaC' marker not found.");
    }

    const blockHeaderByte = buffer.readUInt8(4);
    const blockType = blockHeaderByte & 0x7F; // Mask out the 'last block' bit
    if (blockType !== 0) {
        throw new Error('STREAMINFO block (type 0) not found at the expected position.');
    }

    const blockLength = buffer.readUIntBE(5, 3);
    if (blockLength < 34) {
        throw new Error(`Invalid STREAMINFO block length. Expected 34, got ${blockLength}.`);
    }

    if (buffer.length < 42) {
        throw new Error('Buffer is too short to contain complete STREAMINFO block.');
    }

    const sampleRateBytes = buffer.readUIntBE(18, 3);
    const sampleRate = sampleRateBytes >> 4;

    const totalSamplesByte1 = buffer.readUInt8(21);
    const totalSamplesHigh = totalSamplesByte1 & 0x0F;
    const totalSamplesLow = buffer.readUIntBE(22, 4);
    const totalSamples = (BigInt(totalSamplesHigh) << 32n) + BigInt(totalSamplesLow);

    if (totalSamples > BigInt(Number.MAX_SAFE_INTEGER)) {
        console.warn("Total samples exceeds Number.MAX_SAFE_INTEGER. Precision may be lost.");
    }

    return {
        totalSamples: Number(totalSamples),
        sampleRate: sampleRate,
    };
}

export async function readFileRange(path: string, start: number, end: number): Promise<Buffer> {
    const fd = await open(path, "r");
    try {
        const length = end - start + 1;
        const buf = Buffer.alloc(length);
        await fd.read(buf, 0, length, start);
        return buf;
    } finally {
        await fd.close();
    }
}
