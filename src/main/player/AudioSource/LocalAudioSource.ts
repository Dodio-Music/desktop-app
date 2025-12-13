import {spawn} from "child_process";
import {BaseAudioSource} from "./BaseAudioSource.js";
import {normalizeLUFSToPeaks} from "./helper/WaveformHelper.js";

export class LocalAudioSource extends BaseAudioSource {
    private numPeaks = 600;

    public async start() {
        if (this.cancelled) return;

        this.mainWindow.webContents.send("player:event", {type: "loading-progress", progress: this.getSegmentMapProgress(), id: this.id});

        void this.fillMissingSegments();
        this.startProgressUpdates();

        if(!this.generateWaveform) return;

        void this.calculateLUFSWaveform().catch(err => {
            console.warn("LUFS waveform failed: ", err);
        });
    }

    async spawnFFmpeg(startSec: number, endSec: number) {
        if (this.DEBUG_LOG) console.log("NEW FFMPEG SPAWNED");

        this.ffmpegStartSec = startSec;
        this.ffmpegEndSec = endSec;

        const ffArgs: string[] = [];

        ffArgs.push(
            "-ss", `${startSec}`,
            "-to", `${endSec}`
        );

        ffArgs.push(
            "-i", this.url,
            "-f", "f32le",
            "-acodec", "pcm_f32le",
            "-ac", `${this.outputChannels}`,
            "-ar", `${this.outputSampleRate}`,
            "pipe:1"
        );

        this.ffmpegProcess = spawn(this.ffmpegPath!, ffArgs, {stdio: ["pipe", "pipe", "pipe"]});

        const writeOffset = Math.floor(startSec * this.outputSampleRate * this.outputChannels);
        this.setupFfmpegLifecycle(endSec, writeOffset);
    }

    /** LUFS-based waveform (background process) */
    private async calculateLUFSWaveform() {
        return new Promise<void>((resolve) => {
            const lufsProcess = spawn(this.ffmpegPath!, [
                "-i", this.url,
                "-filter_complex", "ebur128",
                "-f", "null", "-"
            ], {stdio: ["pipe", "pipe", "pipe"]});

            let buffer = "";
            lufsProcess.stderr.setEncoding("utf-8");

            lufsProcess.stderr.on("data", (data) => buffer += data);

            lufsProcess.on("exit", () => {
                const lines = buffer.split(/\r?\n/);
                const lufsValues: number[] = [];

                for (const line of lines) {
                    const match = line.match(/M:\s*(-?\d+(\.\d+)?)/); // momentary loudness
                    if (match) {
                        const val = parseFloat(match[1]);
                        lufsValues.push(val);
                    }
                }

                const peaks = normalizeLUFSToPeaks(lufsValues, {
                    numPeaks: this.numPeaks
                });

                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.emit("waveform:data", {id: this.id, peaks: peaks});
                }

                resolve();
            });
        });
    }
}
