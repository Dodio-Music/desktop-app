import {app, BrowserWindow, ipcMain} from "electron";
import {TrackInfo} from "../../shared/TrackInfo.js";
import playerProcessPath from "../player/PlayerProcess?modulePath";
import {Worker} from "node:worker_threads";
import {QueueManager} from "../player/QueueManager.js";
import {SongEntry} from "../songIndexer.js";
import {PlayerSession} from "../player/PlayerSession.js";

export const registerPlayerProcessIPC = (mainWindow: BrowserWindow) => {
    const playerProcess = new Worker(playerProcessPath);
    const queue = new QueueManager(mainWindow);
    const session = new PlayerSession(mainWindow, playerProcess, queue);

    playerProcess.on("message", async (msg) => {
        if(mainWindow.isDestroyed() || !mainWindow.webContents) return;

        switch(msg.type) {
            case "media-transition": {
                session.updateState(msg.state);
                session.resetPreload();

                mainWindow.webContents.send("player:event", {
                    type: "media-transition",
                    url: session.url,
                    ...(session.getWaveformData()?.url === session.url && { waveformData: session.getWaveformData() }),
                });

                const {preload, source} = session.getSources();
                if(preload) {
                    source?.cancel();
                    session.setSources(preload, null);
                    queue.next();
                }
                break;
            }
            case "player-state": {
                session.updateState(msg.state);

                const remaining =  msg.state.duration - msg.state.currentTime;
                if(remaining <= 5 && !session.isPreloading) {
                    const nextTrack = queue.getNext();
                    if(nextTrack) {
                        session.markPreloadStarted();
                        await session.preloadNextTrack(nextTrack.fullPath, nextTrack.duration ?? 0, "local");
                    }
                }
                break;
            }
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

    ipcMain.handle("player:load-remote", async (_, track: TrackInfo) => {
        await session.loadTrack(track.manifest.url, track.duration, "remote");
    });

    ipcMain.handle("player:load-local", async (_, track: SongEntry, contextTracks: SongEntry[]) => {
        const startIndex = contextTracks.findIndex(t => t.fullPath === track.fullPath);
        queue.setContext("local", contextTracks, startIndex);

        await session.loadTrack(track.fullPath, track.duration ?? 0, "local");
    });

    ipcMain.handle("player:next", async () => {
        const next = queue.next();
        if(next) await session.loadTrack(next.fullPath, next.duration ?? 0, "local");
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
