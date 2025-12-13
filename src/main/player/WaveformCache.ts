import { app } from "electron";
import path from "node:path";
import fs from "node:fs/promises";

export const WAVEFORM_CACHE_DIR = path.join(app.getPath("userData"), "waveforms");

export async function readWaveform(id: string) {
    try {
        const file = path.join(WAVEFORM_CACHE_DIR, `${id}.json`);
        const raw = await fs.readFile(file, "utf8");
        const parsed = JSON.parse(raw) as { peaks: number[] };
        return { peaks: new Float32Array(parsed.peaks) };
    } catch {
        return null;
    }
}

export async function writeWaveform(id: string, peaks: number[] | Float32Array) {
    await fs.mkdir(WAVEFORM_CACHE_DIR, { recursive: true });

    const file = path.join(WAVEFORM_CACHE_DIR, `${id}.json`);

    const peaksArray = Array.isArray(peaks) ? peaks : Array.from(peaks);

    await fs.writeFile(
        file,
        JSON.stringify({ peaks: peaksArray }),
        "utf8"
    );
}
