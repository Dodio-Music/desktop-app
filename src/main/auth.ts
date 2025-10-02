import {app, ipcMain} from "electron";
import path from "path";
import fs from "fs/promises";
import {IAuth} from "../shared/Typing.js";
import {safeStorage} from "electron"

export const authPath = path.join(app.getPath("userData"), "auth.json");

export async function loadAuth(): Promise<IAuth> {
    try {
        const data = await fs.readFile(authPath);
        const decrypted = safeStorage.decryptString(data)
        return JSON.parse(decrypted);
    } catch {
        return {};
    }
}

export async function saveAuth(prefs: IAuth): Promise<void> {
    const data = JSON.stringify(prefs, null, 2);
    const encrypted = safeStorage.encryptString(data);
    await fs.writeFile(authPath, encrypted);
}

export function registerAuthIPC() {
    ipcMain.handle("auth:get", async () => {
        return await loadAuth();
    });

    ipcMain.handle("auth:set", async (_event, prefs: IAuth) => {
        const existing = await loadAuth();
        const newAuth = { ...existing, ...prefs };
        await saveAuth(newAuth);
        return newAuth;
    });
}
