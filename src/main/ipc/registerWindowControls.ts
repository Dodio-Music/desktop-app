import {ipcMain, BrowserWindow, Tray, Menu, app} from "electron";
import icon from "../../../resources/dodo_transparent_white_256.png?asset";
import {loadPreferences} from "../preferences.js";

let tray: Tray | null = null;
let window: BrowserWindow | null = null;

function updateTrayMenu() {
    if (!tray || !window) return;

    const isVisible = window.isVisible();

    const contextMenu = Menu.buildFromTemplate([
        {
            label: isVisible ? "Minimize to Tray" : "Show Dodio",
            click: () => {
                if (isVisible) {
                    window?.hide();
                } else {
                    window?.show();
                }
            }
        },
        {label: "Exit", click: () => app.quit()}
    ]);
    tray.setContextMenu(contextMenu);
}

function emitMaximizeChange() {
    if (!window) return;
    window.webContents.send("maximize-change", window.isMaximized());
}

export async function registerWindowControlsIPC(mainWindow: BrowserWindow) {
    window = mainWindow;

    tray = new Tray(icon);
    tray.setToolTip("Dodio");

    tray.on("click", () => {
        if (!window) return;

        if (!window.isVisible()) {
            window.show();
        }

        updateTrayMenu();
    });
    updateTrayMenu();

    const updateAndEmitMaximize = () => {
        if (tray) updateTrayMenu();
        emitMaximizeChange();
    };

    mainWindow.on("hide", () => updateAndEmitMaximize());
    mainWindow.on("show", () => updateAndEmitMaximize());
    mainWindow.on("restore", () => updateAndEmitMaximize());

    mainWindow.on("maximize", () => updateAndEmitMaximize());
    mainWindow.on("unmaximize", () => updateAndEmitMaximize());

    ipcMain.on("window-minimize", () => {
        mainWindow.minimize();
    });

    ipcMain.on("window-maximize", () => {
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    });

    ipcMain.handle("window-is-maximized", () => {
        return mainWindow.isMaximized();
    });

    ipcMain.on("window-close", () => {
        mainWindow.close();
    });

    const prefs = await loadPreferences();

    mainWindow.on("close", (event) => {
        if (prefs.closeBehavior === "tray") {
            event.preventDefault();
            mainWindow.hide();
            updateTrayMenu();
        } else {
            app.quit();
        }
    });
}
