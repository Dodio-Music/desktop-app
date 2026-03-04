import {app, BrowserWindow, dialog, ipcMain} from "electron";
import electronUpdater, { type AppUpdater } from "electron-updater";
import {PendingUpdate, UpdateStatus} from "../shared/updaterApi.ts";

export function getAutoUpdater(): AppUpdater {
    const { autoUpdater } = electronUpdater;
    return autoUpdater;
}

let window: BrowserWindow = null!;

const registerIPC = (mainWindow: BrowserWindow) => {
    window = mainWindow;
    ipcMain.handle("update:status", () => updateStatus);
    ipcMain.handle("update:check", () => getAutoUpdater().checkForUpdates());
    ipcMain.handle("update:install", () => getAutoUpdater().quitAndInstall());
}
let updateStatus: UpdateStatus = null!;

const setUpdateStatus = (pending: PendingUpdate) => {
    updateStatus.pending = pending;
    window.webContents.send("update:update", updateStatus);
}

export const registerUpdater = (mainWindow: BrowserWindow) => {
    updateStatus = {currentVersion: app.getVersion()};
    mainWindow.webContents.send("update:update", updateStatus);
    registerIPC(mainWindow);

    void getAutoUpdater().checkForUpdates();
    getAutoUpdater().autoDownload = true;

    getAutoUpdater().on("update-available", (info) => {
        setUpdateStatus({
            version: info.version,
            status: "downloading"
        });
    });

    getAutoUpdater().on("update-downloaded", (info) => {
        setUpdateStatus({
            version: info.version,
            status: "downloaded"
        });

        dialog
            .showMessageBox({
                type: "info",
                buttons: ["Install and relaunch", "Remind me later"],
                title: "Dodio",
                message: `A new version of Dodio is available!`,
                detail: `${app.getVersion()} → ${info.version}

Would you like to install it now?`
            })
            .then(result => {
                if (result.response === 0) {
                    getAutoUpdater().quitAndInstall();
                }
            });
    });
}
