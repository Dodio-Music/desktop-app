import {BrowserWindow, ipcMain} from "electron";
import {store} from "../preferences.js";

export const registerMagnifierIPC = (mainWindow: BrowserWindow) => {
    let zoomFactor = store.get("zoomFactor");

    const updateZoomFactor = () => {
        store.set("zoomFactor", zoomFactor);
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
