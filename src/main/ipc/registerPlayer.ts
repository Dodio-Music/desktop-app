import {Player} from "../player/Player.js";
import {BrowserWindow, ipcMain} from "electron";
import {FLACStreamSource} from "../player/FLACStreamSource.js";
import {TrackInfo} from "../../shared/TrackInfo.js";
import {parseFile} from "music-metadata";

export const registerPlayerIPC = (mainWindow: BrowserWindow) => {
    const player = new Player();

    player.onStateChange = (state) => {
        mainWindow.webContents.send("player:update", state);
    }

    ipcMain.handle("player:load-remote", async (_, track: TrackInfo) => {
        await player.load(new FLACStreamSource(track.manifest.url, track.manifest.channels, track.manifest.sampleRate), track.duration);
    });

    ipcMain.handle("player:load-local", async(_, path: string) => {
        const metadata = await parseFile(path);

        const numberOfChannels = metadata.format.numberOfChannels || 2;
        const sampleRate = metadata.format.sampleRate || 44100;
        const trackDuration = metadata.format.duration ?? 0;

        await player.load(new FLACStreamSource(path, numberOfChannels, sampleRate), trackDuration);
    });

    ipcMain.handle('player:pause-or-resume', () => player.pauseOrResume());
}
