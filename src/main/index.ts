import { electronApp, optimizer } from "@electron-toolkit/utils";
import {app, BrowserWindow, protocol, net, ipcMain} from "electron";
import { registerMagnifierIPC } from "./ipc/registerMagnifier.js";
import {registerPlayerProcessIPC, registerPlayerProcessStartup} from "./ipc/registerPlayerProcess.js";
import { registerWindowControlsIPC } from "./ipc/registerWindowControls.js";
import { registerSongIndexer } from "./songIndexer.js";
import { createMainWindow, registerAppLifecycle } from "./window.js";
import {registerDodioApiIPC} from "./ipc/registerDodioApi.js";
import {registerAuthStartup, setupAuth} from "./auth.js";
import path from "path";
import {runCleanupTasks} from "./ipc/shutdownManager.js";
import {setupApi} from "./web/dodio_api.js";
import {loadPreferencesFromDisk, registerPreferencesIPC} from "./preferences.js";

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

    ipcMain.handle("renderer:ready", () => {
        registerAuthStartup();
        registerPlayerProcessStartup();
    });

    setupApi();
    createWindow();
    registerPreferencesIPC();
    registerPlayerProcessIPC(mainWindow, prefs);
    void setupAuth(mainWindow);
    await registerWindowControlsIPC(mainWindow, prefs);
    await registerMagnifierIPC(mainWindow, prefs);
    registerSongIndexer(mainWindow);
    registerDodioApiIPC();

    registerAppLifecycle(createWindow);
});
