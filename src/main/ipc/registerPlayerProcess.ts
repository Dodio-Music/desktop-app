import {BrowserWindow, ipcMain} from "electron";
import {BaseSongEntry, LocalSongEntry, RemoteSongEntry} from "../../shared/TrackInfo.js";
import playerProcessPath from "../player/PlayerProcess?modulePath";
import {Worker} from "node:worker_threads";
import {QueueManager} from "../player/QueueManager.js";
import {PlayerSession} from "../player/PlayerSession.js";
import {registerCleanupTask} from "./shutdownManager.js";

export const registerPlayerProcessIPC = (mainWindow: BrowserWindow) => {
    const playerProcess = new Worker(playerProcessPath);
    const queue = new QueueManager(mainWindow);
    const session = new PlayerSession(mainWindow, playerProcess, queue);

    playerProcess.on("message", async (msg) => {
        if(mainWindow.isDestroyed() || !mainWindow.webContents || msg.type === "device-info") return;
        session.updateState(msg.state);

        switch(msg.type) {
            case "media-transition": {
                session.resetPreload();

                const {preloadSource, currentSource} = session.getSources();
                const {preloadTrack } = session.getTracks();

                if(preloadTrack && preloadSource) {
                    currentSource?.cancel();
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

                if(currentTrack && !session.isPreloading) {
                    const next = queue.getNext();
                    if(next) {
                        session.markPreloadStarted();
                        void session.preloadNextTrack(next);
                    }
                }

                break;
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
        queue.setContext("remote", contextTracks, startIndex);

        await session.loadTrack(track);
    });

    ipcMain.handle("player:load-local", async (_, track: LocalSongEntry, contextTracks: BaseSongEntry[]) => {
        const startIndex = contextTracks.findIndex(t => t.id === track.id);
        queue.setContext("local", contextTracks, startIndex);

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

    ipcMain.handle("player:seek", (_, time: number) => {
        session.seek(time);
    });
};
