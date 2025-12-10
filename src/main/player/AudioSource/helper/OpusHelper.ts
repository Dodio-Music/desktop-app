export async function getOggDuration(
    data: ArrayBuffer | Buffer,
    codec: OggCodec
): Promise<number> {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

    let offset = 0;
    let lastGranule = 0;

    while (offset < buf.length) {
        const header = buf.subarray(offset, offset + 4);
        if (String.fromCharCode(...header) !== "OggS") break;

        const gp = Number(buf.readBigUInt64LE(offset + 6));
        if (gp > lastGranule) {
            lastGranule = gp;
        }

        const segCount = buf[offset + 26];
        const segmentTableStart = offset + 27;

        const segmentSizes = buf.subarray(segmentTableStart, segmentTableStart + segCount);
        const totalPageSize = segmentSizes.reduce((a, b) => a + b, 0);

        offset = segmentTableStart + segCount + totalPageSize;
    }

    let granuleRate: number;

    if (codec === "opus") {
        granuleRate = 48000;
    } else if (codec === "vorbis") {
        granuleRate = extractVorbisSampleRate(buf);
    } else {
        throw new Error("Unknown codec; cannot compute duration");
    }

    return lastGranule / granuleRate;
}

function extractVorbisSampleRate(buf: Buffer): number {
    const segCount = buf[26];
    const segmentTableStart = 27;

    const segmentSizes = buf.subarray(segmentTableStart, segmentTableStart + segCount);
    const packetSize = segmentSizes.reduce((a, b) => a + b, 0);

    const packetStart = segmentTableStart + segCount;
    const packet = buf.subarray(packetStart, packetStart + packetSize);

    return packet.readUInt32LE(12);
}

export type OggCodec = "opus" | "vorbis" | "unknown";

export function detectOggCodec(data: ArrayBuffer | Buffer): OggCodec {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

    const header = buf.subarray(0, 4);
    if (String.fromCharCode(...header) !== "OggS") return "unknown";

    const segCount = buf[26];
    const segmentTableStart = 27;

    const segmentSizes = buf.subarray(segmentTableStart, segmentTableStart + segCount);
    const packetSize = segmentSizes.reduce((a, b) => a + b, 0);

    const packetStart = segmentTableStart + segCount;
    const packet = buf.subarray(packetStart, packetStart + packetSize);

    if (String.fromCharCode(...packet.subarray(0, 8)) === "OpusHead") return "opus";
    if (packet[0] === 0x01 && String.fromCharCode(...packet.subarray(1, 7)) === "vorbis") return "vorbis";

    return "unknown";
}
