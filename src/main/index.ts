import {app, shell, BrowserWindow, ipcMain} from "electron";
import {join} from "path";
import {electronApp, optimizer, is} from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import {screen} from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import {registerSongIndexer} from "./songIndexer.js";
import {Player} from "./player/Player.js";
import chunkWorkerPath from "./player/ChunkWorker?modulePath";
import {Worker} from "node:worker_threads";

let mainWindow: BrowserWindow;

function createWindow() {
    const state = loadState();
    const defaultBounds = { width: 1280, height: 720 };
    const bounds = validateBounds(state.bounds) || defaultBounds;

    mainWindow = new BrowserWindow({
        ...bounds,
        show: false,
        frame: false,

        titleBarStyle: "hidden",
        autoHideMenuBar: true,
        ...(process.platform === "linux" ? {icon} : {}),
        webPreferences: {
            preload: join(__dirname, "../preload/index.mjs"),
            sandbox: false,
            nodeIntegrationInWorker: true
        }
    });

    mainWindow.once("ready-to-show", () => {
        if (state.fullscreen) {
            mainWindow.setFullScreen(true);
            mainWindow.show();
        } else if(state.maximized) {
            if (state.bounds) mainWindow.setBounds(state.bounds);
            mainWindow.maximize();
        } else {
            mainWindow.show();
        }
    });

    mainWindow.on("close", () => saveState(mainWindow));

    mainWindow.on("maximize", () => mainWindow.webContents.send("window-is-maximized", true));
    mainWindow.on("unmaximize", () => mainWindow.webContents.send("window-is-maximized", false));

    mainWindow.webContents.setWindowOpenHandler((details) => {
        void shell.openExternal(details.url);
        return {action: "deny"};
    });

    ipcMain.handle("get-window-state", () => {
        return globalThis.windowState || null;
    });

    ipcMain.on("set-window-state", (_, state) => {
        globalThis.windowState = state;
    });

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
        void mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    } else {
        void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
    }
}

app.whenReady().then(() => {
    electronApp.setAppUserModelId("com.underswing");
    app.on("browser-window-created", (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    ipcMain.on("window-minimize", (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        win?.minimize();
    });

    ipcMain.on("window-maximize", (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return;
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    });

    ipcMain.handle("window-is-maximized", (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        return win?.isMaximized() ?? false;
    });

    ipcMain.on("window-close", (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        win?.close();
    });

    createWindow();

    app.on("activate", function () {
        // macOS stuff
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    registerSongIndexer();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

type WindowState = {
    bounds?: Electron.Rectangle;
    maximized?: boolean;
    fullscreen?: boolean;
}

const boundsPath = path.join(app.getPath("userData"), "window-state.json");

function loadState(): WindowState {
    try {
        return JSON.parse(fs.readFileSync(boundsPath, "utf-8"));
    } catch {
        return {};
    }
}

function saveState(win: BrowserWindow) {
    const state: WindowState = {
        maximized: win.isMaximized(),
        fullscreen: win.isFullScreen(),
        bounds: win.getNormalBounds()
    };
    fs.writeFileSync(boundsPath, JSON.stringify(state));
}

function validateBounds(savedBounds?: Electron.Rectangle) {
    if (!savedBounds) return null;

    const display = screen.getDisplayMatching(savedBounds);
    const area = display.workArea;

    const outOfBounds =
        savedBounds.x > area.x + area.width ||
        savedBounds.x + savedBounds.width < area.x ||
        savedBounds.y > area.y + area.height ||
        savedBounds.y + savedBounds.height < area.y;

    return outOfBounds ? null : savedBounds;
}

// const runAsWorker = () => {
//     const playerWorker = new Worker(workerPath);
//
//     app.on("before-quit", async() => {
//         if(playerWorker) {
//             playerWorker.postMessage({type: "stop"});
//             await playerWorker.terminate();
//         }
//     });
//
//     playerWorker.on("message", (msg) => {
//         if(msg.type === "state") {
//             mainWindow.webContents.send("player:update", msg.payload);
//         }
//     });
//
//     playerWorker.on("error", (err) => console.error("Worker error", err));
//
//     ipcMain.handle("player:load", async (_, path: string) => {
//         playerWorker.postMessage({type: "load", path});
//     });
//
//     ipcMain.handle("player:pause-or-resume", () => {
//         playerWorker.postMessage({type: "pauseOrResume"});
//     });
// }
//
const runWorker = () => {
    ipcMain.handle("player:load", async (_, path: string) => {
        const worker = new Worker(chunkWorkerPath);

         worker.postMessage({
             type: "init",
             options: { channels: 2, sampleRate: 44100, bitDepth: 16 }
         });
        //
        // const ffmpeg = spawn(ffmpegPath!, [
        //     "-i", path,
        //     "-f", "s16le",
        //     "-acodec", "pcm_s16le",
        //     "-ac", "2",
        //     "-ar", "44100",
        //     "pipe:1"
        // ], { stdio: ["ignore", "pipe", "ignore"] });
        //
        // ffmpeg.stdout.on("data", chunk => {
        //     worker.postMessage({ type: "pcm", chunk });
        // });
        //
        // ffmpeg.on("close", () => {
        //     worker.postMessage({ type: "stop" });
        // });
    });
}

const runNative = () => {
    const player = new Player();

    player.onStateChange = (state) => {
        mainWindow.webContents.send("player:update", state);
    }

    ipcMain.handle("player:load", async (_, path: string) => {
        await player.load(path);
    });

    ipcMain.handle('player:pause-or-resume', () => player.pauseOrResume());
}

runNative()

let zoomFactor = 1;

const updateZoomFactor = () => {
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

ipcMain.handle("get:zoom", () => {
    return mainWindow.webContents.getZoomFactor();
});
