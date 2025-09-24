import {BrowserWindow, ipcMain} from "electron";
import {Worker} from "node:worker_threads";
import playerWorkerPath from "../player/playerWorker?modulePath";
import {TrackInfo} from "../../shared/TrackInfo.js";
import {parseFile} from "music-metadata";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import {spawn} from "child_process";
import {ChildProcessByStdio} from "node:child_process";
import {Readable} from "node:stream";
import {TrackMetadata} from "../player/PlayerEchogarden.js";

const ffmpegPath =
    process.env.NODE_ENV === "development"
        ? (typeof ffmpegStatic === "string" ? ffmpegStatic : ffmpegStatic.default)
        : path.join(process.resourcesPath, "ffmpeg", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");

let ffmpegProcess: ChildProcessByStdio<null, Readable, null> | null = null;

export const registerPlayerEchogardenWorkerIPC = (mainWindow: BrowserWindow) => {
    const worker = new Worker(playerWorkerPath);

    worker.on("message", (msg) => {
        if (msg.type === "state" && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("player:update", msg.state);
        }
    });

    ipcMain.handle("player:load-remote", async (_, track: TrackInfo) => {
        initSource(track.manifest.url, {
            channels: track.manifest.channels,
            sampleRate: track.manifest.sampleRate,
            duration: track.duration
        });
    });

    ipcMain.handle("player:load-local", async (_, path: string) => {
        const metadata = await parseFile(path);
        const channels = metadata.format.numberOfChannels || 2;
        const sampleRate = metadata.format.sampleRate || 44100;
        const duration = metadata.format.duration ?? 0;

        initSource(path, {channels, sampleRate, duration});
    });

    const initSource = (url: string, meta: TrackMetadata) => {
        if (ffmpegProcess) ffmpegProcess.kill("SIGKILL");

        ffmpegProcess = spawn(ffmpegPath!, [
            "-i", url,
            "-f", "s16le",
            "-acodec", "pcm_s16le",
            "-ac", `${meta.channels}`,
            "-ar", `${meta.sampleRate}`,
            "pipe:1"
        ], {stdio: ["ignore", "pipe", "ignore"]});

        worker.postMessage({
            type: "init-buffer-source",
            meta: {
                duration: meta.duration,
                channels: meta.channels,
                sampleRate: meta.sampleRate
            }
        });

        ffmpegProcess.stdout.on("data", (chunk) => {
            worker.postMessage({type: "pcm-chunk", chunk}, [chunk.buffer]);
        });

        ffmpegProcess.on("exit", () => {
            worker.postMessage({type: "pcm-end"});
        });
    };

    ipcMain.handle("player:pause-or-resume", () => {
        worker.postMessage({type: "pause-or-resume"});
    });

    mainWindow.on("closed", () => {
        void worker.terminate();
    });
};
