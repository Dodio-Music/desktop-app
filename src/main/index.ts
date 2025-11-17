import { electronApp, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, protocol, net } from "electron";
import { registerMagnifierIPC } from "./ipc/registerMagnifier.js";
import { registerPlayerProcessIPC } from "./ipc/registerPlayerProcess.js";
import { registerWindowControlsIPC } from "./ipc/registerWindowControls.js";
import {loadPreferencesFromDisk, registerPreferencesIPC} from "./preferences.js";
import { registerSongIndexer } from "./songIndexer.js";
import { createMainWindow, registerAppLifecycle } from "./window.js";
import {registerDodioApiIPC} from "./ipc/registerDodioApi.js";
import {setupAuth} from "./auth.js";
import path from "path";
import {runCleanupTasks} from "./ipc/shutdownManager.js";

let mainWindow: BrowserWindow;

function createWindow() {
    mainWindow = createMainWindow();
    return mainWindow;
}

app.on("before-quit", async (event) => {
    event.preventDefault();
    await runCleanupTasks();
    app.exit();
});

app.whenReady().then(async () => {
    electronApp.setAppUserModelId("com.underswing");

    protocol.handle("safe-file", (request) => {
        const url = request.url.replace("safe-file://", "");
        const filePath = "file://" + path.normalize(`${app.getPath("userData")}/${url}`);
        return net.fetch(filePath);
    })

    //devtools init
    app.on("browser-window-created", (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    const prefs = await loadPreferencesFromDisk();

    createWindow();
    registerSongIndexer(mainWindow);
    await registerWindowControlsIPC(mainWindow, prefs);
    await registerMagnifierIPC(mainWindow, prefs);
    registerPreferencesIPC();
    registerPlayerProcessIPC(mainWindow);
    registerDodioApiIPC();
    void setupAuth(mainWindow);

    registerAppLifecycle(createWindow);
});
