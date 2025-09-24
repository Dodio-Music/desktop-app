import {app, BrowserWindow} from "electron";
import {electronApp, optimizer} from "@electron-toolkit/utils";
import {registerSongIndexer} from "./songIndexer.js";
import {registerWindowControlsIPC} from "./ipc/registerWindowControls.js";
import {registerMagnifierIPC} from "./ipc/registerMagnifier.js";
import {registerPreferencesIPC} from "./preferences.js";
import {createMainWindow, registerAppLifecycle} from "./window.js";
import {registerPlayerEchogardenWorkerIPC} from "./ipc/registerPlayerEchogarden.js";

let mainWindow: BrowserWindow;

function createWindow() {
    mainWindow = createMainWindow();
    return mainWindow;
}

app.whenReady().then(() => {
    electronApp.setAppUserModelId("com.underswing");
    app.on("browser-window-created", (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });
    createWindow();
    registerWindowControlsIPC();
    registerSongIndexer(mainWindow);
    registerPreferencesIPC();
    registerPlayerEchogardenWorkerIPC(mainWindow);
    void registerMagnifierIPC(mainWindow);

    registerAppLifecycle(createWindow);
});
