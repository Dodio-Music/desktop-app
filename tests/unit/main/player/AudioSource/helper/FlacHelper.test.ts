import { describe, it, expect, vi } from 'vitest';
import { extractSeekTable, findFlacAudioStart, parseFlacStreamInfo, readFileRange } from '@main/player/AudioSource/helper/FlacHelper';

vi.mock('fs/promises', () => ({
    open: vi.fn(),
    default: {
        open: vi.fn()
    }
}));

import fs from 'fs/promises';

describe('FlacHelper', () => {
    describe('parseFlacStreamInfo', () => {
        it('throws error if fLaC marker is missing', () => {
            const buf = Buffer.alloc(10);
            expect(() => parseFlacStreamInfo(buf)).toThrow("Not a valid FLAC file. 'fLaC' marker not found.");
        });

        it('throws error if first block is not STREAMINFO', () => {
            const buf = Buffer.alloc(10);
            buf.write('fLaC', 0, 4, 'ascii');
            buf.writeUInt8(1, 4); // Type 1 instead of 0
            expect(() => parseFlacStreamInfo(buf)).toThrow('STREAMINFO block (type 0) not found at the expected position.');
        });

        it('throws error if block length is too small', () => {
            const buf = Buffer.alloc(10);
            buf.write('fLaC', 0, 4, 'ascii');
            buf.writeUInt8(0, 4);
            buf.writeUIntBE(10, 5, 3); // Length 10 < 34
            expect(() => parseFlacStreamInfo(buf)).toThrow('Invalid STREAMINFO block length. Expected 34, got 10.');
        });

        it('parses sample rate and total samples correctly', () => {
            // Mock STREAMINFO block (34 bytes)
            const buf = Buffer.alloc(42);
            buf.write('fLaC', 0, 4, 'ascii');
            // block type 0 (STREAMINFO), length 34
            buf.writeUInt32BE(0x00000022, 4); 
            
            // Sample rate: 44100 (0x0AC44)
            // In STREAMINFO, sample rate is 20 bits at offset 18
            // 0x0AC44 << 4 = 0xAC440
            buf.writeUIntBE(0xAC440, 18, 3);

            // Total samples: 1000000 (0x0F4240)
            // 36 bits starting at offset 21 (lower 4 bits) + 4 bytes at 22
            // Byte 21: (0x0F4240 >> 32) & 0x0F = 0
            // Bytes 22-25: 0x000F4240
            buf.writeUInt8(0x00, 21);
            buf.writeUInt32BE(1000000, 22);

            const info = parseFlacStreamInfo(buf);
            expect(info.sampleRate).toBe(44100);
            expect(info.totalSamples).toBe(1000000);
        });
    });

    describe('findFlacAudioStart', () => {
        it('throws if not a flac file', () => {
            const buf = Buffer.from('NOTFLAC');
            expect(() => findFlacAudioStart(buf)).toThrow("Not a FLAC file");
        });

        it('throws if no end marker is found', () => {
            const buf = Buffer.alloc(10);
            buf.write('fLaC', 0, 4, 'ascii');
            buf.writeUInt32BE(0x00000000, 4); // Not last, type 0
            expect(() => findFlacAudioStart(buf)).toThrow("No end-of-metadata marker found");
        });

        it('finds start of audio frames after metadata', () => {
            const buf = Buffer.alloc(100);
            buf.write('fLaC', 0, 4, 'ascii');
            
            // Block 1: STREAMINFO, not last, length 34
            buf.writeUInt32BE(0x00000022, 4);
            
            // Block 2: Last block, type 1 (PADDING), length 10
            // 0x80 | 1 = 0x81
            buf.writeUInt8(0x81, 4 + 4 + 34);
            buf.writeUIntBE(10, 4 + 4 + 34 + 1, 3);

            const start = findFlacAudioStart(buf);
            // 4 (marker) + 4 (h1) + 34 (b1) + 4 (h2) + 10 (b2) = 56
            expect(start).toBe(56);
        });
    });

    describe('extractSeekTable', () => {
        it('throws if not a flac file', async () => {
            const buf = Buffer.from('NOTFLAC');
            await expect(extractSeekTable(buf)).rejects.toThrow("Not a FLAC file");
        });

        it('extracts seek points from SEEKTABLE block', async () => {
            const buf = Buffer.alloc(100);
            buf.write('fLaC', 0, 4, 'ascii');

            // Block 1: SEEKTABLE (type 3), last, length 36 (2 points)
            buf.writeUInt8(0x83, 4);
            buf.writeUIntBE(36, 5, 3);

            // Point 1: sample 0, offset 0, frames 100
            buf.writeBigUInt64BE(0n, 8);
            buf.writeBigUInt64BE(0n, 16);
            buf.writeUInt16BE(100, 24);

            // Point 2: sample 44100, offset 5000, frames 100
            buf.writeBigUInt64BE(44100n, 26);
            buf.writeBigUInt64BE(5000n, 34);
            buf.writeUInt16BE(100, 42);

            const points = await extractSeekTable(buf);
            expect(points).toHaveLength(2);
            expect(points[0].sampleNumber).toBe(0n);
            expect(points[1].sampleNumber).toBe(44100n);
            expect(points[1].streamOffset).toBe(5000n);
        });
    });

    describe('readFileRange', () => {
        it('reads a chunk of a file', async () => {
            const mockFileHandle = {
                read: vi.fn().mockImplementation((buf: Buffer) => {
                    buf.write('HELLO');
                    return Promise.resolve({ bytesRead: 5 });
                }),
                close: vi.fn().mockResolvedValue(undefined)
            };
            vi.mocked(fs.open).mockResolvedValue(mockFileHandle as any);

            const buf = await readFileRange('dummy.flac', 0, 4);
            expect(buf.toString()).toBe('HELLO');
            expect(mockFileHandle.close).toHaveBeenCalled();
        });
    });
});
