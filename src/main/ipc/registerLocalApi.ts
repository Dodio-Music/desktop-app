import {ipcMain, shell} from "electron";
import {getPreferences} from "../preferences.js";

export const registerLocalApiIPC = () => {
    ipcMain.handle("local:open-folder", async () => {
        const prefs = getPreferences();
        if (prefs.localFilesDir) {
            await shell.openPath(prefs.localFilesDir);
        } else {
            console.error("Local files directory is not configured.");
        }
    });
};
