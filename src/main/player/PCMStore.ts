import {EventEmitter} from "node:events";

export class PCMStore extends EventEmitter {
    private buffers: Buffer[] = [];
    private length = 0;

    append(chunk: Buffer) {
        this.buffers.push(chunk);
        this.length += chunk.length;
        this.emit("data");
    }

    size() {
        return this.length;
    }

    read(offset: number, length: number): Buffer {
        if(offset >= this.length) return Buffer.alloc(0);

        const out = Buffer.alloc(Math.min(length, this.length - offset));
        let copied = 0;
        let remaining = out.length;
        let pos = 0;

        for(const buffer of this.buffers) {
            // we want to skip ahead to the correct buffer
            if(offset >= pos + buffer.length) {
                pos += buffer.length;
                continue;
            }

            const start = Math.max(0, offset - pos);
            const toCopy = Math.min(buffer.length - start, remaining);
            buffer.copy(out, copied, start, start + toCopy);

            copied += toCopy;
            remaining -= toCopy;
            pos += buffer.length;

            if(remaining <= 0) break;
        }

        return out;
    }
}
