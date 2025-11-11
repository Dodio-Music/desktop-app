import { electronApp, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow } from "electron";
import { registerMagnifierIPC } from "./ipc/registerMagnifier.js";
import { registerPlayerProcessIPC } from "./ipc/registerPlayerProcess.js";
import { registerWindowControlsIPC } from "./ipc/registerWindowControls.js";
import { registerPreferencesIPC } from "./preferences.js";
import { registerSongIndexer } from "./songIndexer.js";
import { createMainWindow, registerAppLifecycle } from "./window.js";
import {registerDodioApiIPC} from "./ipc/registerDodioApi.js";
import {setupAuth} from "./auth.js";

let mainWindow: BrowserWindow;

function createWindow() {
    mainWindow = createMainWindow();
    return mainWindow;
}

app.whenReady().then(async () => {
    electronApp.setAppUserModelId("com.underswing");

    //devtools init
    app.on("browser-window-created", (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    createWindow();
    await registerWindowControlsIPC(mainWindow);
    registerSongIndexer(mainWindow);
    registerPreferencesIPC();
    registerPlayerProcessIPC(mainWindow);
    registerDodioApiIPC();
    await registerMagnifierIPC(mainWindow);
    void setupAuth(mainWindow);

    registerAppLifecycle(createWindow);
});
