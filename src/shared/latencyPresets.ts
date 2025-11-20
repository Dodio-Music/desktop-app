export type LatencyPreset = {
    label: string;
    bufferSize: number;
    maxQueue: number;
    approxLatencyMs: number;
};

const referenceSampleRate = 44100;
const calculateLatency = (sampleRate: number, queue: number, bufferSize: number) => {
    return bufferSize * (queue + 1) / sampleRate * 1000;
}

export const latencyPresets: Record<string, LatencyPreset> = {
    "compatibility": {
        label: "Compatibility (Very High Latency)",
        bufferSize: 1024,
        maxQueue: 8,
        approxLatencyMs: calculateLatency(referenceSampleRate, 8, 1024)
    },
    "ultra-safe": {
        label: "Ultra Safe (High Latency)",
        bufferSize: 512,
        maxQueue: 4,
        approxLatencyMs: calculateLatency(referenceSampleRate, 4, 1024)
    },
    "safe": {
        label: "Safe (Default)",
        bufferSize: 256,
        maxQueue: 4,
        approxLatencyMs: calculateLatency(referenceSampleRate, 4, 256)
    },
    "low": {
        label: "Low Latency",
        bufferSize: 256,
        maxQueue: 2,
        approxLatencyMs: calculateLatency(referenceSampleRate, 2, 256),
    },
    "ultra-low": {
        label: "Ultra Low",
        bufferSize: 128,
        maxQueue: 1,
        approxLatencyMs: calculateLatency(referenceSampleRate, 1, 128),
    },
}

const fallback = latencyPresets.safe;
const preset = "safe";
export const activePreset = latencyPresets[preset] || fallback;
