import {app, BrowserWindow, ipcMain} from "electron";
import {SEGMENT_DURATION, TrackInfo} from "../../shared/TrackInfo.js";
import {parseFile} from "music-metadata";
import playerProcessPath from "../player/PlayerProcess?modulePath";
import {IMsg, OutputDevice} from "../player/PlayerProcess.js";
import {Worker} from "node:worker_threads";
import {FLACStreamSource, WaveformMode} from "../player/FlacStreamSource.js";
import {SourceType} from "../../shared/PlayerState.js";

export const registerPlayerProcessIPC = (mainWindow: BrowserWindow) => {
    const playerProcess = new Worker(playerProcessPath);
    let source: FLACStreamSource | null = null;

    playerProcess.on("message", async (state) => {
        if (!mainWindow.isDestroyed() && mainWindow.webContents) {
            mainWindow.webContents.send("player:update", state.state);
        }
    });

    app.on("before-quit", async (event) => {
        event.preventDefault();

        playerProcess.postMessage({type: "shutdown"});

        await new Promise<void>((resolve) => {
            playerProcess.once("exit", resolve);
            setTimeout(() => playerProcess.terminate(), 5000);
        });

        app.exit();
    });

    mainWindow.on("blur", () => playerProcess.postMessage({type: "focus-update", payload: false}));
    mainWindow.on("focus", () => playerProcess.postMessage({type: "focus-update", payload: true}));

    const loadTrackInWorker = async (pathOrUrl: string, duration: number, sourceType: SourceType) => {
        mainWindow.webContents.send("player:track-change");
        mainWindow.webContents.send("player:loading-progress", []);

        const devInfo = await getDeviceInfoFromWorker();
        const totalSamples = Math.ceil(duration * devInfo.sampleRate * devInfo.channels);

        const pcmSab = new SharedArrayBuffer(totalSamples * Float32Array.BYTES_PER_ELEMENT);

        const totalSegments = Math.ceil(duration / SEGMENT_DURATION);
        const segmentSab = new SharedArrayBuffer(totalSegments);

        if (source) source.cancel();
        source = new FLACStreamSource(pathOrUrl, devInfo.channels, devInfo.sampleRate, duration, pcmSab, mainWindow, sourceType, WaveformMode.LUFS, segmentSab);
        void source.start();

        playerProcess.postMessage({
            type: "load",
            payload: {
                pcmSab,
                path: pathOrUrl,
                duration,
                devInfo,
                segmentSab,
                sourceType
            }
        });
    };

    const getDeviceInfoFromWorker = async (): Promise<OutputDevice> => {
        return new Promise((resolve, reject) => {
            const onMessage = (msg: IMsg<OutputDevice>) => {
                if (msg.type === "device-info") {
                    playerProcess.off("message", onMessage);
                    resolve(msg.payload);
                }
            };
            playerProcess.on("message", onMessage);

            playerProcess.postMessage({ type: "get-init-device" });

            setTimeout(() => {
                playerProcess.off("message", onMessage);
                reject(new Error("Device info request timed out"));
            }, 2000);
        });
    };

    ipcMain.handle("player:load-remote", async (_, track: TrackInfo) => {
        await loadTrackInWorker(track.manifest.url, track.duration, "remote");
    });

    ipcMain.handle("player:load-local", async (_, pathToFile: string) => {
        const metadata = await parseFile(pathToFile);
        const duration = metadata.format.duration ?? 0;

        await loadTrackInWorker(pathToFile, duration, "local");
    });

    ipcMain.handle("player:set-volume", (_, volume: number) => {
        playerProcess.postMessage({type: "set-volume", payload: volume});
    });

    ipcMain.handle("player:pause-or-resume", () => {
        playerProcess.postMessage({type: "pause-or-resume"});
    });

    ipcMain.handle("player:seek", (_, time: number) => {
        if(source) void source.seek(time);
        playerProcess.postMessage({type: "seek", payload: time});
    });
};

