import { ipcMain, app } from "electron";
import path from "path";
import fs from "fs/promises";

export interface IPreferences {
    zoomFactor: number;
    localFilesDir?: string;
    volume: number;
    muted: boolean;
}

const prefsPath = path.join(app.getPath("userData"), "preferences.json");

const defaultPrefs: IPreferences = {
    zoomFactor: 1,
    localFilesDir: undefined,
    volume: 1,
    muted: false
};

export async function loadPreferences(): Promise<IPreferences> {
    try {
        const data = await fs.readFile(prefsPath, "utf-8");
        return { ...defaultPrefs, ...JSON.parse(data) };
    } catch {
        return defaultPrefs;
    }
}

async function savePreferences(prefs: IPreferences): Promise<void> {
    const json = JSON.stringify(prefs, null, 2);
    await fs.writeFile(prefsPath, json, "utf-8");
}

export async function setPreferences(prefs: Partial<IPreferences>) {
    const existing = await loadPreferences();
    const newPrefs = { ...existing, ...prefs };
    await savePreferences(newPrefs);
    return newPrefs;
}

export function registerPreferencesIPC() {
    ipcMain.handle("preferences:get", async () => {
        return await loadPreferences();
    });

    ipcMain.handle("preferences:set", async (_event, prefs: Partial<IPreferences>) => {
        return setPreferences(prefs);
    });
}
