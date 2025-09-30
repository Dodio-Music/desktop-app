import {app, BrowserWindow, ipcMain} from "electron";
import {TrackInfo} from "../../shared/TrackInfo.js";
import {parseFile} from "music-metadata";
import playerProcessPath from "../player/PlayerProcess?modulePath";
import {getDevices, getHostAPIs} from "@underswing/naudiodon";
import {Worker} from "node:worker_threads";
import {FLACStreamSource} from "../player/FlacStreamSource.js";

const getDeviceInfo = () => {
    const hostAPIs = getHostAPIs();
    const defaultId = hostAPIs.HostAPIs[hostAPIs.defaultHostAPI].defaultOutput;
    const devices = getDevices();
    const defaultDevice = devices[defaultId];

    return {sampleRate: defaultDevice.defaultSampleRate, channels: defaultDevice.maxOutputChannels, deviceId: defaultId};
};

export const registerPlayerProcessIPC = (mainWindow: BrowserWindow) => {
    const playerProcess = new Worker(playerProcessPath);
    let source: FLACStreamSource | null = null;

    playerProcess.on("message", async (state) => {
        if (!mainWindow.isDestroyed() && mainWindow.webContents) {
            mainWindow.webContents.send("player:update", state);
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

    const loadTrackInWorker = async (pathOrUrl: string, duration: number) => {
        const devInfo = getDeviceInfo();
        const totalSamples = Math.ceil(duration * devInfo.sampleRate * devInfo.channels);

        const pcmSab = new SharedArrayBuffer(totalSamples * Float32Array.BYTES_PER_ELEMENT);
        const writtenSab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
        const writtenIndex = new Int32Array(writtenSab);
        writtenIndex[0] = 0;

        if (source) source.cancel();
        source = new FLACStreamSource(pathOrUrl, devInfo.channels, devInfo.sampleRate, pcmSab, writtenSab);
        void source.start();

        playerProcess.postMessage({
            type: "load",
            payload: {
                pcmSab,
                path: pathOrUrl,
                writtenSab,
                duration,
                devInfo
            }
        });
    };

    ipcMain.handle("player:load-remote", async (_, track: TrackInfo) => {
        await loadTrackInWorker(track.manifest.url, track.duration);
    });

    ipcMain.handle("player:load-local", async (_, pathToFile: string) => {
        const metadata = await parseFile(pathToFile);
        const duration = metadata.format.duration ?? 0;

        await loadTrackInWorker(pathToFile, duration);
    });

    ipcMain.handle("player:set-volume", (_, volume: number) => {
        playerProcess.postMessage({type: "set-volume", payload: volume});
    });

    ipcMain.handle("player:pause-or-resume", () => {
        playerProcess.postMessage({type: "pause-or-resume"});
    });

    ipcMain.handle("player:seek", (_, time: number) => {
        playerProcess.postMessage({type: "seek", payload: time});
    });
};

