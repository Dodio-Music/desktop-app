import { ipcMain, app } from "electron";
import path from "path";
import fs from "fs/promises";
import {clearTimeout} from "node:timers";
import {registerCleanupTask} from "./ipc/shutdownManager.js";

export interface IPreferences {
    zoomFactor: number;
    localFilesDir?: string;
    volume: number;
    muted: boolean;
    latencyPreset: string;
    closeBehavior: "quit" | "tray";
}

const prefsPath = path.join(app.getPath("userData"), "preferences.json");
const tmpPath = prefsPath + ".tmp";

const defaultPrefs: IPreferences = {
    zoomFactor: 1,
    localFilesDir: undefined,
    volume: 1,
    muted: false,
    latencyPreset: "safe",
    closeBehavior: "quit"
};

let prefs: IPreferences = {...defaultPrefs};
let initialized = false;
let saveTimeout: NodeJS.Timeout | null = null;

export async function loadPreferencesFromDisk(): Promise<IPreferences> {
    try {
        const raw = await fs.readFile(prefsPath, "utf-8");
        prefs = {...defaultPrefs, ...JSON.parse(raw)};
    } catch {
        prefs = {...defaultPrefs};
        await savePreferencesDisk();
    }
    initialized = true;
    return prefs;
}

async function savePreferencesDisk(): Promise<void> {
    const json = JSON.stringify(prefs, null, 2);
    await fs.writeFile(tmpPath, json, "utf-8");
    await fs.rename(tmpPath, prefsPath);
}

function scheduleSave() {
    if(saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => savePreferencesDisk(), 500);
}

export function getPreferences() {
    if (!initialized) throw new Error("Preferences not loaded yet");
    return prefs;
}

export function setPreferences(update: Partial<IPreferences>) {
    if(!initialized) throw new Error("Preferences not loaded yet");

    prefs = {...prefs, ...update};
    scheduleSave();
    return prefs;
}

export function registerPreferencesIPC() {
    ipcMain.handle("preferences:get", async () => getPreferences());
    ipcMain.handle("preferences:set", (_event, prefs: Partial<IPreferences>) => setPreferences(prefs));
}

registerCleanupTask(async () => {
    await savePreferencesDisk();
});
