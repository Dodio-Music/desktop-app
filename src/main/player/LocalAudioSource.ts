import {spawn} from "child_process";
import {BaseAudioSource} from "./BaseAudioSource.js";

export class LocalAudioSource extends BaseAudioSource {
    private numPeaks = 600;
    private waveformBuckets: Float32Array = new Float32Array(this.numPeaks);

    public async start() {
        if (this.cancelled) return;

        this.mainWindow.webContents.send("player:event", {type: "loading-progress", progress: this.getSegmentMapProgress()});

        void this.fillMissingSegments();
        this.startProgressUpdates();

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
        this.waveformBuckets = new Float32Array(this.numPeaks);
        return new Promise<void>((resolve, reject) => {
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

                if (lufsValues.length === 0) {
                    return reject(new Error("No LUFS data found"));
                }

                const maxLUFS = Math.max(...lufsValues);
                const minLUFS = Math.max(maxLUFS - 20, -40);
                const skipFrames = Math.ceil(0.22 / 0.1);
                const trimmedValues = lufsValues.slice(skipFrames);
                for (let i = 0; i < this.numPeaks; i++) {
                    const idx = Math.floor((i / this.numPeaks) * trimmedValues.length);
                    let normalized = (trimmedValues[idx] - minLUFS) / (maxLUFS - minLUFS);
                    normalized = Math.min(Math.max(normalized, 0), 1);
                    normalized = Math.pow(normalized, 2);
                    this.waveformBuckets[i] = normalized;
                }

                const peaksToSend = this.waveformBuckets;
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.emit("waveform:data", {url: this.url, peaks: peaksToSend});
                }

                resolve();
            });
        });
    }
}
