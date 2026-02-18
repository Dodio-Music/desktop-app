import {electronApp, is, optimizer} from "@electron-toolkit/utils";
import {app, BrowserWindow, protocol, net} from "electron";
import { registerMagnifierIPC } from "./ipc/registerMagnifier.js";
import {registerPlayerProcessIPC} from "./ipc/registerPlayerProcess.js";
import { registerWindowControlsIPC } from "./ipc/registerWindowControls.js";
import {createMainWindow, registerAppLifecycle} from "./window.js";
import {registerDodioApiIPC} from "./ipc/registerDodioApi.js";
import {setupAuth} from "./auth.js";
import path from "path";
import {runCleanupTasks} from "./ipc/shutdownManager.js";
import {setupApi} from "./web/dodio_api.js";
import {loadPreferencesFromDisk, registerPreferencesIPC} from "./preferences.js";
import {registerDashboardIPC} from "./dashboard.js";
import {installExtension, REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS} from "electron-devtools-installer";
import {registerSongIndexIPC} from "./songIndex.js";

let mainWindow: BrowserWindow;

app.on("before-quit", async (event) => {
    event.preventDefault();
    await runCleanupTasks();
    app.exit();
});

if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient(
            "dodio",
            process.execPath,
            [path.resolve(process.argv[1])]
        );
    }
} else {
    app.setAsDefaultProtocolClient("dodio");
}

const gotTheLock = app.requestSingleInstanceLock();


if (!is.dev) {
    if (!gotTheLock) {
        app.quit();
    } else {
        app.on("second-instance", (_event, commandLine) => {
            const url = commandLine.find(arg => arg.startsWith("dodio://"));
            if (url) {
                handleDeepLink(url);
            }

            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        });
    }
}

function handleDeepLink(url: string) {
    if (!mainWindow) return;

    mainWindow.webContents.send("deep-link", url);
}

app.whenReady().then(async () => {
    electronApp.setAppUserModelId("com.underswing");

    protocol.handle("safe-file", (request) => {
        const url = request.url.replace("safe-file://", "");
        const filePath = "file://" + path.normalize(`${app.getPath("userData")}/${url}`);
        return net.fetch(filePath);
    })

    //devtools shortcuts
    app.on("browser-window-created", (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    const prefs = await loadPreferencesFromDisk();

    setupApi();
    mainWindow = createMainWindow();
    const deepLink = process.argv.find(arg => arg.startsWith("dodio://"));
    if (deepLink) {
        handleDeepLink(deepLink);
    }
    registerPreferencesIPC();
    registerPlayerProcessIPC(mainWindow, prefs);
    void setupAuth(mainWindow);
    await registerWindowControlsIPC(mainWindow, prefs);
    await registerMagnifierIPC(mainWindow, prefs);
    registerSongIndexIPC(mainWindow);
    registerDodioApiIPC();
    registerDashboardIPC(mainWindow);

    registerAppLifecycle(createMainWindow);

    installExtension([REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS])
        .then(([redux, react]) => console.log(`Added Extensions:  ${redux.name}, ${react.name}`))
        .catch((err) => console.log("An error occurred: ", err));
});
