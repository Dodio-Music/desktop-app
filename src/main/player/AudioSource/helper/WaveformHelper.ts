import {RemoteSongEntry} from "../../../../shared/TrackInfo.js";

export async function resolveRemoteWaveform(track: RemoteSongEntry): Promise<Float32Array | null> {
    if (!track.waveformUrl) return null;

    const res = await fetch(track.waveformUrl);
    if (!res.ok) return null;

    const json: number[] = await res.json();
    if (!Array.isArray(json)) return null;

    const peaks = normalizeLUFSToPeaks(json, {
        numPeaks: 600
    });

    return new Float32Array(peaks);
}

export interface NormalizeLUFSOptions {
    numPeaks: number;
    windowLUFS?: number;
    minFloorLUFS?: number;
    skipSeconds?: number;
    frameDuration?: number;
    power?: number;
}

export function normalizeLUFSToPeaks(lufsValues: readonly number[], options: NormalizeLUFSOptions): Float32Array {
    if (lufsValues.length === 0) {
        throw new Error("No LUFS data provided");
    }

    const {
        numPeaks,
        windowLUFS = 20,
        minFloorLUFS = -40,
        skipSeconds = 0.22,
        frameDuration = 0.1,
        power = 2
    } = options;

    const skipFrames = Math.ceil(skipSeconds / frameDuration);
    const trimmed = lufsValues.slice(skipFrames);

    if (trimmed.length === 0) {
        throw new Error("LUFS array too short after trimming");
    }

    const maxLUFS = Math.max(...trimmed);
    const minLUFS = Math.max(maxLUFS - windowLUFS, minFloorLUFS);

    const peaks = new Float32Array(numPeaks);

    for (let i = 0; i < numPeaks; i++) {
        const idx = Math.floor((i / numPeaks) * trimmed.length);
        let v = (trimmed[idx] - minLUFS) / (maxLUFS - minLUFS);
        v = Math.min(Math.max(v, 0), 1);
        peaks[i] = Math.pow(v, power);
    }

    return peaks;
}

