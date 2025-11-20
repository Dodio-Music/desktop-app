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
import {configDotenv} from "dotenv";
import {setupApi} from "./web/dodio_api.js";

const env_arg = process.argv.find(v => v.startsWith("env="));
const env_name = env_arg?.substring("env=".length);

if(!env_name) throw new Error("env argument required!");

const env_path = path.join(".env", env_name+".env");

console.log("Loading env:", env_path);
const configResult = configDotenv({
    path: env_path
});

if(configResult.error) {
    console.error(configResult.error);
    throw new Error("Could not load env file");
}

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

    setupApi();
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
