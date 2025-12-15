import {useEffect, useRef} from "react";
import {WaveformData} from "../../../../../../shared/PlayerState";

export function useWaveform (waveformData: WaveformData | undefined, width: number, height: number, currentTrackId: string | null) {
    const offscreenCanvasRef = useRef<HTMLCanvasElement>(
        (() => {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            return canvas;
        })()
    );

    const peaks = waveformData?.peaks;
    const id = waveformData?.id;

    useEffect(() => {
        const canvas = offscreenCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;

        const middle = height / 2;
        ctx.clearRect(0, 0, width, height);
        const fallbackHeightFraction = 0.25;
        ctx.fillStyle = "rgb(255,255,255)";
        if (!peaks || peaks.length === 0 || currentTrackId !== id) {
            ctx.fillRect(0, middle - fallbackHeightFraction * height / 2, width, fallbackHeightFraction * height);
        } else {
            const barWidth = width / peaks.length;
            const minHeightFraction = 0.08;
            for (let i = 0; i < peaks.length; i++) {
                const normalized = Math.min(Math.max(peaks[i], 0), 1);
                const remapped = minHeightFraction + normalized * (1 - minHeightFraction);
                const barHeight = remapped * height;
                const x = i * barWidth;
                ctx.fillRect(x, middle - barHeight / 2, barWidth, barHeight);
            }
        }

        offscreenCanvasRef.current = canvas;
    }, [width, height, currentTrackId, id, peaks]);

    return offscreenCanvasRef;
}
