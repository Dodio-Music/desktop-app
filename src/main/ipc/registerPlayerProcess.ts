import {app, BrowserWindow, ipcMain} from "electron";
import {BaseSongEntry, LocalSongEntry, RemoteSongEntry} from "../../shared/TrackInfo.js";
import playerProcessPath from "../player/PlayerProcess?modulePath";
import {Worker} from "node:worker_threads";
import {QueueManager} from "../player/QueueManager.js";
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

                const {preloadSource, currentSource} = session.getSources();
                const {preloadTrack } = session.getTracks();
                if(preloadTrack && preloadSource) {
                    currentSource?.cancel();
                    session.setSources(preloadSource, null);
                    session.setTracks(preloadTrack, null);
                    queue.next();
                }

                session.resetPreload();

                mainWindow.webContents.send("player:event", {
                    type: "media-transition",
                    url: session.id,
                    ...(session.getWaveformData()?.id === session.id && { waveformData: session.getWaveformData() }),
                });

                break;
            }
            case "player-state": {
                session.updateState(msg.state);

                const remaining =  msg.state.duration - msg.state.currentTime;
                if(remaining <= 5 && !session.isPreloading) {
                    const nextTrack = queue.getNext();
                    if(nextTrack) {
                        session.markPreloadStarted();
                        await session.preloadNextTrack(nextTrack);
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

    ipcMain.handle("player:load-remote", async (_, track: RemoteSongEntry) => {
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
