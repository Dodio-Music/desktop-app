import { describe, it, expect } from 'vitest';
import { detectOggCodec, getOggDuration } from '@main/player/AudioSource/helper/OpusHelper';

describe('OpusHelper', () => {
    describe('detectOggCodec', () => {
        it('returns unknown for non-ogg data', () => {
            const buf = Buffer.from('not an ogg');
            expect(detectOggCodec(buf)).toBe('unknown');
        });

        it('detects opus codec', () => {
            const buf = Buffer.alloc(100);
            buf.write('OggS', 0, 4, 'ascii');
            buf.writeUInt8(1, 26); // 1 segment
            buf.writeUInt8(8, 27); // segment size 8
            buf.write('OpusHead', 28, 8, 'ascii');

            expect(detectOggCodec(buf)).toBe('opus');
        });

        it('detects vorbis codec', () => {
            const buf = Buffer.alloc(100);
            buf.write('OggS', 0, 4, 'ascii');
            buf.writeUInt8(1, 26); // 1 segment
            buf.writeUInt8(7, 27); // segment size 7
            buf.writeUInt8(0x01, 28);
            buf.write('vorbis', 29, 6, 'ascii');

            expect(detectOggCodec(buf)).toBe('vorbis');
        });
    });

    describe('getOggDuration', () => {
        it('throws for unknown codec', async () => {
            const buf = Buffer.alloc(100);
            await expect(getOggDuration(buf, 'unknown' as any)).rejects.toThrow("Unknown codec; cannot compute duration");
        });

        it('stops if OggS marker is missing', async () => {
            const buf = Buffer.from('NOTOGG');
            const duration = await getOggDuration(buf, 'opus');
            expect(duration).toBe(0);
        });

        it('calculates opus duration based on last granule', async () => {
            const buf = Buffer.alloc(100);
            // Page 1
            buf.write('OggS', 0, 4, 'ascii');
            buf.writeBigUInt64LE(48000n, 6); // 1 second at 48k
            buf.writeUInt8(1, 26);
            buf.writeUInt8(10, 27);
            
            // Page 2 (higher granule)
            const p2 = 27 + 1 + 10;
            buf.write('OggS', p2, 4, 'ascii');
            buf.writeBigUInt64LE(96000n, p2 + 6); // 2 seconds
            buf.writeUInt8(1, p2 + 26);
            buf.writeUInt8(10, p2 + 27);

            const duration = await getOggDuration(buf, 'opus');
            expect(duration).toBe(2);
        });

        it('extracts vorbis sample rate and calculates duration', async () => {
            const buf = Buffer.alloc(100);
            // Header Page with Vorbis Info
            buf.write('OggS', 0, 4, 'ascii');
            buf.writeUInt8(1, 26);
            buf.writeUInt8(30, 27); // packet size 30
            // Vorbis identification packet starts at 28
            // Sample rate at offset 12 of packet (28 + 12 = 40)
            buf.writeUInt32LE(44100, 40);

            // Last Page with Granule
            const p2 = 28 + 30;
            buf.write('OggS', p2, 4, 'ascii');
            buf.writeBigUInt64LE(88200n, p2 + 6); // 2 seconds at 44.1k
            buf.writeUInt8(0, p2 + 26); // 0 segments just for test

            const duration = await getOggDuration(buf, 'vorbis');
            expect(duration).toBe(2);
        });
    });
});
