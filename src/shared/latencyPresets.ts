export type LatencyPreset = {
    label: string;
    bufferSize: number;
    maxQueue: number;
    approxLatencyMs: number;
};

const sampleRate = 44100;
const calculateLatency = (sampleRate: number, queue: number, bufferSize: number) => {
    return bufferSize * queue / sampleRate * 1000;
}

export const latencyPresets: Record<string, LatencyPreset> = {
    "compatibility": {
        label: "Compatibility (Very High Latency)",
        bufferSize: 1024,
        maxQueue: 8,
        approxLatencyMs: calculateLatency(sampleRate, 8, 1024)
    },
    "ultra-safe": {
        label: "Ultra Safe (High Latency)",
        bufferSize: 1024,
        maxQueue: 4,
        approxLatencyMs: calculateLatency(sampleRate, 4, 1024)
    },
    "safe": {
        label: "Safe (Default)",
        bufferSize: 512,
        maxQueue: 4,
        approxLatencyMs: calculateLatency(sampleRate, 4, 512)
    },
    "low": {
        label: "Low Latency",
        bufferSize: 256,
        maxQueue: 3,
        approxLatencyMs: calculateLatency(sampleRate, 3, 256),
    },
    "ultra-low": {
        label: "Ultra Low",
        bufferSize: 128,
        maxQueue: 2,
        approxLatencyMs: calculateLatency(sampleRate, 2, 128),
    }
}

const fallback = latencyPresets.safe;
const preset = "low";
export const activePreset = latencyPresets[preset] || fallback;
