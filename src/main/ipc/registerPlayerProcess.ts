import {BrowserWindow, ipcMain} from "electron";
import {BaseSongEntry, LocalSongEntry, RemoteSongEntry} from "../../shared/TrackInfo.js";
import playerProcessPath from "../player/PlayerProcess?modulePath";
import {Worker} from "node:worker_threads";
import {QueueManager} from "../player/QueueManager.js";
import {PlayerSession} from "../player/PlayerSession.js";
import {registerCleanupTask} from "./shutdownManager.js";
import {RepeatMode} from "../../shared/PlayerState.js";
import {IAllPreferences} from "../preferences.js";

let playerProcess!: Worker;
let queue!: QueueManager;
let session!: PlayerSession;
export const registerPlayerProcessIPC = (mainWindow: BrowserWindow, initialPrefs: IAllPreferences) => {
    playerProcess = new Worker(playerProcessPath);
    queue = new QueueManager(mainWindow, initialPrefs.repeatMode);
    session = new PlayerSession(mainWindow, playerProcess, queue);

    playerProcess.on("message", async (msg) => {
        if(mainWindow.isDestroyed() || !mainWindow.webContents || msg.type === "device-info") return;
        session.updateState(msg.state);

        switch(msg.type) {
            case "media-transition": {
                session.resetPreload();

                if(queue.getRepeatMode() === RepeatMode.One) queue.cycleRepeatMode("backward");

                const {preloadSource} = session.getSources();
                const {preloadTrack } = session.getTracks();

                if(preloadTrack && preloadSource) {
                    session.setSources(preloadSource, null);
                    session.setTracks(preloadTrack, null);
                    queue.next();
                }

                const {currentTrack} = session.getTracks();

                if(currentTrack) {
                    const waveform = session.getWaveformMap().get(currentTrack.id);
                    mainWindow.webContents.send("player:event", {
                        type: "media-transition",
                        ...(waveform && { waveformData: waveform }),
                        track: session.getTracks().currentTrack
                    });
                }

                await session.tryPreloadNext();
                break;
            }
            case "replaying": {
                const curSource = session.getSources().currentSource;
                if(!curSource) return;

                void curSource.seek(0);
            }
        }
    });

    registerCleanupTask(async () => {
        playerProcess.postMessage({type: "shutdown"});

        await new Promise<void>((resolve) => {
            playerProcess.once("exit", resolve);
            setTimeout(() => playerProcess.terminate(), 5000);
        });
    });

    mainWindow.on("blur", () => playerProcess.postMessage({type: "focus-update", payload: false}));
    mainWindow.on("focus", () => playerProcess.postMessage({type: "focus-update", payload: true}));

    ipcMain.handle("player:load-remote", async (_, track: RemoteSongEntry, contextTracks: RemoteSongEntry[]) => {
        const startIndex = contextTracks.findIndex(t => t.id === track.id);
        queue.setContext(contextTracks, startIndex);

        await session.loadTrack(track);
    });

    ipcMain.handle("player:load-local", async (_, track: LocalSongEntry, contextTracks: BaseSongEntry[]) => {
        const startIndex = contextTracks.findIndex(t => t.id === track.id);
        queue.setContext(contextTracks, startIndex);

        await session.loadTrack(track);
    });

    ipcMain.handle("player:next", async () => {
        const next = queue.next();
        if(next) await session.loadTrack(next);
    });

    ipcMain.handle("player:previous", async () => {
        await session.previous();
    });

    ipcMain.handle("player:set-volume", (_, volume: number) => {
        playerProcess.postMessage({type: "set-volume", payload: volume});
    });

    ipcMain.handle("player:pause-or-resume", () => {
        playerProcess.postMessage({type: "pause-or-resume"});
    });

    ipcMain.handle("player:repeat-mode", () => {
        queue.cycleRepeatMode("forward");
    });

    ipcMain.handle("player:seek", (_, time: number) => {
        session.seek(time);
    });

    queue.on("next-track", (track: BaseSongEntry) => {
        const currentTrack = session.getTracks().currentTrack;
        if(queue.getRepeatMode() === "one" && currentTrack !== null) playerProcess.postMessage({type: "next-track", payload: currentTrack});
        else playerProcess.postMessage({type: "next-track", payload: track});
    });
};

ipcMain.handle("player:get-initial-redux", () => {
    return queue.getInitialRedux();
});
