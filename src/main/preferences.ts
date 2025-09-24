import { ipcMain, app } from "electron";
import path from "path";
import fs from "fs/promises";

export interface IPreferences {
    zoomFactor: number;
    localFilesDir?: string;
}

const prefsPath = path.join(app.getPath("userData"), "preferences.json");

const defaultPrefs: IPreferences = {
    zoomFactor: 1,
    localFilesDir: undefined,
};

export async function loadPreferences(): Promise<IPreferences> {
    try {
        const data = await fs.readFile(prefsPath, "utf-8");
        return { ...defaultPrefs, ...JSON.parse(data) };
    } catch {
        return defaultPrefs;
    }
}

export async function savePreferences(prefs: Partial<IPreferences>): Promise<void> {
    const json = JSON.stringify(prefs, null, 2);
    await fs.writeFile(prefsPath, json, "utf-8");
}

export function registerPreferencesIPC() {
    ipcMain.handle("preferences:get", async () => {
        return await loadPreferences();
    });

    ipcMain.handle("preferences:set", async (_event, prefs: IPreferences) => {
        const existing = await loadPreferences();
        const newPrefs = { ...existing, ...prefs };
        await savePreferences(newPrefs);
        return newPrefs;
    });
}
