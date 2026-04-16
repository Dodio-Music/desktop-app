import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readWaveform, writeWaveform } from '@main/player/WaveformCache';
import fs from 'node:fs/promises';

// Mock electron
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock-user-data')
    }
}));

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn().mockResolvedValue(undefined),
        mkdir: vi.fn().mockResolvedValue(undefined)
    }
}));

describe('WaveformCache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('readWaveform', () => {
        it('returns peaks as Float32Array if file exists', async () => {
            const mockPeaks = [0.1, 0.2, 0.3];
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ peaks: mockPeaks }));

            const result = await readWaveform('track-1');
            expect(result).not.toBeNull();
            expect(result?.peaks).toBeInstanceOf(Float32Array);
            
            const resultArr = Array.from(result!.peaks);
            expect(resultArr).toHaveLength(mockPeaks.length);
            resultArr.forEach((val, i) => {
                expect(val).toBeCloseTo(mockPeaks[i], 5);
            });
        });

        it('returns null if file does not exist', async () => {
            vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
            const result = await readWaveform('non-existent');
            expect(result).toBeNull();
        });
    });

    describe('writeWaveform', () => {
        it('creates directory and writes json file', async () => {
            const mockPeaks = new Float32Array([0.5, 0.6]);
            await writeWaveform('track-2', mockPeaks);

            expect(fs.mkdir).toHaveBeenCalled();
            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('track-2.json'),
                expect.stringMatching(/\{"peaks":\[0\.5,0\.6000000238418579\]\}/),
                'utf8'
            );
        });
    });
});
