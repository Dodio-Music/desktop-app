import {BrowserWindow, ipcMain} from "electron";
import {IPreferences, setPreferences} from "../preferences.js";

export const registerMagnifierIPC = async (mainWindow: BrowserWindow, prefs: IPreferences) => {
     let zoomFactor = prefs.zoomFactor;

    const updateZoomFactor = async () => {
        void setPreferences({zoomFactor: Math.round(zoomFactor)});
        mainWindow.webContents.setZoomFactor(zoomFactor);
        mainWindow.webContents.send("zoom-factor-changed", zoomFactor);
    }

    ipcMain.handle("zoom:in", () => {
        zoomFactor += 0.1;
        updateZoomFactor();
    });

    ipcMain.handle("zoom:out", () => {
        zoomFactor = Math.max(0.2, zoomFactor - 0.1);
        updateZoomFactor();
    });

    ipcMain.handle("zoom:reset", () => {
        zoomFactor = 1;
        updateZoomFactor();
    });

    ipcMain.handle("zoom:get", () => {
        return zoomFactor;
    });
}
