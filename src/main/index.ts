import {electronApp, optimizer} from "@electron-toolkit/utils";
import {app, BrowserWindow, protocol, net} from "electron";
import {registerMagnifierIPC} from "./ipc/registerMagnifier.js";
import {registerPlayerProcessIPC} from "./ipc/registerPlayerProcess.js";
import {registerWindowControlsIPC} from "./ipc/registerWindowControls.js";
import {createMainWindow} from "./window.js";
import {registerDodioApiIPC} from "./ipc/registerDodioApi.js";
import {applyLogin, setupAuth} from "./auth.js";
import path from "path";
import {runCleanupTasks} from "./ipc/shutdownManager.js";
import dodioApi, {setupApi} from "./web/dodio_api.js";
import {loadPreferencesFromDisk, registerPreferencesIPC} from "./preferences.js";
import {registerDashboardIPC} from "./dashboard.js";
import {installExtension, REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS} from "electron-devtools-installer";
import {registerSongIndexIPC} from "./songIndex.js";
import {SignInResponse} from "./web/Typing";
import {registerUpdater} from "./updater.js";

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


if (!gotTheLock) {
    app.quit();
} else {
    app.on("second-instance", (_event, commandLine) => {
        const url = commandLine.find(arg => arg.startsWith("dodio://"));
        if (url) {
            void handleDeepLink(url);
        }

        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

async function handleDeepLink(url: string) {
    if (!mainWindow) return;

    try {
        const parsedUrl = new URL(url);
        switch (parsedUrl.hostname) {
            case "auth": {
                const otp = parsedUrl.searchParams.get("otp");
                if (!otp) {
                    console.error("Otp query param not found:", parsedUrl);
                    mainWindow.webContents.send("ui:toast", "error", "One time signin failed!");
                    break;
                }

                const res = await dodioApi.plainRequest<SignInResponse>("post", "/auth/otp-signin", {otp});
                if(res.type === "error") {
                    mainWindow.webContents.send("ui:toast", "error", "One time signin failed!");
                    console.error(res.error);
                    break;
                }

                applyLogin(res.value);
                mainWindow.webContents.send("ui:toast", "success", `Successfully signed in as ${res.value.username}.`);
                mainWindow.webContents.send("ui:navigate", "/");
                break;
            }
            default:
                console.error("Unknown deep link path:", parsedUrl.pathname);
        }
    } catch (err) {
        console.error("Failed to parse deep link:", url, err);
    }
}

app.whenReady().then(async () => {
    electronApp.setAppUserModelId("at.dodio");

    protocol.handle("safe-file", (request) => {
        const url = request.url.replace("safe-file://", "");
        const filePath = "file://" + path.normalize(`${app.getPath("userData")}/${url}`);
        return net.fetch(filePath);
    });

    //devtools shortcuts
    app.on("browser-window-created", (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    const prefs = await loadPreferencesFromDisk();

    setupApi();
    mainWindow = createMainWindow();
    const deepLink = process.argv.find(arg => arg.startsWith("dodio://"));
    if (deepLink) {
        void handleDeepLink(deepLink);
    }
    registerPreferencesIPC();
    registerPlayerProcessIPC(mainWindow, prefs);
    void setupAuth(mainWindow);
    await registerWindowControlsIPC(mainWindow, prefs);
    await registerMagnifierIPC(mainWindow, prefs);
    registerSongIndexIPC(mainWindow);
    registerDodioApiIPC();
    registerDashboardIPC(mainWindow);

    registerUpdater();

    installExtension([REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS])
        .then(([redux, react]) => console.log(`Added Extensions:  ${redux.name}, ${react.name}`))
        .catch((err) => console.log("An error occurred: ", err));
});
