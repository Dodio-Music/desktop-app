import {JsonStore} from "./JsonStore.js";
import {ipcMain} from "electron";
import {RepeatMode} from "../shared/PlayerState.js";

export type IAllPreferences  = IPreferences & IState;

export interface IPreferences {
    localFilesDir?: string;
    latencyPreset: string;
    closeBehavior: "quit" | "tray";
}

export interface IState {
    zoomFactor: number;
    volume: number;
    muted: boolean;
    repeatMode: RepeatMode;
}

const defaultPrefs: IPreferences = {
    localFilesDir: undefined,
    latencyPreset: "safe",
    closeBehavior: "quit"
};

const defaultState: IState = {
    zoomFactor: 1,
    volume: 1,
    muted: false,
    repeatMode: RepeatMode.All
}

const preferencesStore = new JsonStore<IPreferences>("preferences.json", defaultPrefs);
const stateStore = new JsonStore<IState>("state.json", defaultState);

export async function loadPreferencesFromDisk() {
    const prefs = await preferencesStore.load();
    const state = await stateStore.load();
    return { ...prefs, ...state };
}

export function getPreferences() {
    return {
        ...preferencesStore.get(),
        ...stateStore.get(),
    };
}

export function setPreferences(update: Partial<IPreferences & IState>) {
    const persistentUpdate: Partial<IPreferences> = {};
    const stateUpdate: Partial<IState> = {};

    for (const key in update) {
        if (key in defaultPrefs) {
            persistentUpdate[key as keyof IPreferences] = update[key as keyof typeof update] as never;
        } else {
            stateUpdate[key as keyof IState] = update[key as keyof typeof update] as never;
        }
    }

    if (Object.keys(persistentUpdate).length) preferencesStore.set(persistentUpdate);
    if (Object.keys(stateUpdate).length) stateStore.set(stateUpdate);

    return getPreferences();
}


export function registerPreferencesIPC() {
    ipcMain.handle("preferences:get", () => getPreferences());
    ipcMain.handle("preferences:set", (_e, update: Partial<IPreferences & IState>) =>
        setPreferences(update)
    );
}
