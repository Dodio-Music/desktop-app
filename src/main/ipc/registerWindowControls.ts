import {ipcMain, BrowserWindow} from "electron";

export function registerWindowControlsIPC() {
    ipcMain.on("window-minimize", (event) => {
        BrowserWindow.fromWebContents(event.sender)?.minimize();
    });

    ipcMain.on("window-maximize", (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return;
        win.isMaximized() ? win.unmaximize() : win.maximize();
    });

    ipcMain.handle("window-is-maximized", (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        return win?.isMaximized() ?? false;
    });

    ipcMain.on("window-close", (event) => {
        BrowserWindow.fromWebContents(event.sender)?.close();
    });
}
