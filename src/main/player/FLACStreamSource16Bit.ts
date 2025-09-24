export interface PCMSource {
    read(offset: number, length: number): Buffer;
    size(): number;
    append(chunk: Buffer): void;
}

export class FLACStreamSource16Bit implements PCMSource {
    private buffers: Buffer[] = [];
    private length = 0;

    append(chunk: Uint8Array) {
        this.buffers.push(Buffer.from(chunk));
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
}
