import {BrowserWindow, ipcMain} from "electron";
import {IPreferences, setPreferences} from "../preferences.js";

export const registerMagnifierIPC = async (mainWindow: BrowserWindow, prefs: IPreferences) => {
     let zoomFactor = prefs.zoomFactor;

    const roundZoom = (factor: number) => Math.round(factor * 10) / 10;

    const applyZoom = () => {
        mainWindow.webContents.setZoomFactor(zoomFactor);
        mainWindow.webContents.send("zoom-factor-changed", zoomFactor);
    };

    mainWindow.webContents.once("did-finish-load", () => {
        applyZoom();
    });

    const updateZoomFactor = async () => {
        void setPreferences({zoomFactor: zoomFactor = roundZoom(zoomFactor)});
        applyZoom();
    };

    ipcMain.handle("zoom:in", () => {
        zoomFactor = Math.min(3, zoomFactor + 0.1);
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
