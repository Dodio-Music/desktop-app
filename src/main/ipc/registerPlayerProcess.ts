import {app, BrowserWindow, ipcMain} from "electron";
import {TrackInfo} from "../../shared/TrackInfo.js";
import {parseFile} from "music-metadata";
import playerProcessPath from "../player/PlayerProcess?modulePath";
import {getDevices, getHostAPIs} from "@underswing/naudiodon";
import {Worker} from "node:worker_threads";
import {FLACStreamSource} from "../player/FlacStreamSource.js";
import {SourceType} from "../../shared/PlayerState.js";

interface DeviceInfo {
    sampleRate: number,
    channels: number,
    deviceId: number
}

const getDeviceInfo = (): DeviceInfo => {
    const hostAPIs = getHostAPIs();
    const defaultId = hostAPIs.HostAPIs[hostAPIs.defaultHostAPI].defaultOutput;
    const devices = getDevices();
    const defaultDevice = devices[defaultId];

    return {sampleRate: defaultDevice.defaultSampleRate, channels: Math.min(defaultDevice.maxOutputChannels, 2), deviceId: defaultId};
};

export const registerPlayerProcessIPC = (mainWindow: BrowserWindow) => {
    const playerProcess = new Worker(playerProcessPath);
    let source: FLACStreamSource | null = null;
    let willWakeDevice = false;

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
    mainWindow.on("focus", () => {
        willWakeDevice = true;
        setTimeout(() => {
            if(willWakeDevice) {
                playerProcess.postMessage({type: "focus-update", payload: true});
                willWakeDevice = false;
            }
        }, 1000);
    });

    const loadTrackInWorker = async (pathOrUrl: string, duration: number, sourceType: SourceType) => {
        mainWindow.webContents.send("player:track-change");
        mainWindow.webContents.send("player:loading-progress", 0);
        willWakeDevice = false;

        const devInfo = getDeviceInfo();
        const totalSamples = Math.ceil(duration * devInfo.sampleRate * devInfo.channels);

        const pcmSab = new SharedArrayBuffer(totalSamples * Float32Array.BYTES_PER_ELEMENT);
        const writtenSab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
        const writtenIndex = new Int32Array(writtenSab);
        writtenIndex[0] = 0;

        if (source) source.cancel();
        source = new FLACStreamSource(pathOrUrl, devInfo.channels, devInfo.sampleRate, duration, pcmSab, writtenSab, mainWindow, sourceType);
        void source.start();

        playerProcess.postMessage({
            type: "load",
            payload: {
                pcmSab,
                path: pathOrUrl,
                writtenSab,
                duration,
                devInfo,
                sourceType
            }
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
        playerProcess.postMessage({type: "seek", payload: time});
    });
};

