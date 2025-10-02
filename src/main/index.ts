import { electronApp, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow } from "electron";
import { registerAuthIPC } from "./auth.js";
import { registerMagnifierIPC } from "./ipc/registerMagnifier.js";
import { registerPlayerProcessIPC } from "./ipc/registerPlayerProcess.js";
import { registerWindowControlsIPC } from "./ipc/registerWindowControls.js";
import { registerPreferencesIPC } from "./preferences.js";
import { registerSongIndexer } from "./songIndexer.js";
import { createMainWindow, registerAppLifecycle } from "./window.js";

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
    registerPlayerProcessIPC(mainWindow);
    registerAuthIPC();
    void registerMagnifierIPC(mainWindow);

    registerAppLifecycle(createWindow);
});
