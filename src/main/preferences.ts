import {ipcMain} from "electron";
import Store from "electron-store";

export interface IPreferences {
    zoomFactor: number;
    localFilesDir?: string;
}

export const store = new Store<IPreferences>({
    defaults: {
        zoomFactor: 1,
        localFilesDir: undefined
    }
});


export function registerPreferencesIPC() {
    ipcMain.handle("preferences:get", () => store.store);
    ipcMain.handle("preferences:set", (_, prefs: IPreferences) => {
        store.set(prefs);
        return store.store;
    });
}
