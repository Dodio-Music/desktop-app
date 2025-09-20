import {Player} from "../player/Player.js";
import {BrowserWindow, ipcMain} from "electron";

export const registerPlayerIPC = (mainWindow: BrowserWindow) => {
    const player = new Player();

    player.onStateChange = (state) => {
        mainWindow.webContents.send("player:update", state);
    }

    ipcMain.handle("player:load", async (_, path: string) => {
        await player.load(path);
    });

    ipcMain.handle('player:pause-or-resume', () => player.pauseOrResume());
}
