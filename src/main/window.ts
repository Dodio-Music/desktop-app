import {app, BrowserWindow, ipcMain, screen, shell} from "electron";
import {join} from "path";
import * as fs from "fs";
import * as path from "path";
import icon from "../../resources/icon.png?asset";
import {is} from "@electron-toolkit/utils";

export type WindowState = {
    bounds?: Electron.Rectangle;
    maximized?: boolean;
    fullscreen?: boolean;
};

let mainWindow: BrowserWindow;

const boundsPath = path.join(app.getPath("userData"), "window-state.json");

export function loadWindowState(): WindowState {
    try {
        return JSON.parse(fs.readFileSync(boundsPath, "utf-8"));
    } catch {
        return {};
    }
}

export function saveWindowState(win: BrowserWindow) {
    const state: WindowState = {
        maximized: win.isMaximized(),
        fullscreen: win.isFullScreen(),
        bounds: win.getNormalBounds(),
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

export function createMainWindow(): BrowserWindow {
    const state = loadWindowState();
    const defaultBounds = {width: 1280, height: 720};
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

    mainWindow.on("close", () => saveWindowState(mainWindow));
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

    return mainWindow;
}


export function registerAppLifecycle(createWindowFn: () => BrowserWindow) {
    // macOS activate
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindowFn();
        }
    });

    // All windows closed (quit on non-macOS)
    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            app.quit();
        }
    });
}
