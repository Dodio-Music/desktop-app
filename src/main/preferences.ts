import {ipcMain} from "electron";
import Store from "electron-store";

interface IPreferences {
    zoomFactor: number;
}

export const store = new Store<IPreferences>({
    defaults: {
        zoomFactor: 1
    }
});


export function registerPreferencesIPC() {
    ipcMain.handle("preferences:get", () => store.get("zoomFactor"));
    ipcMain.handle("preferences:set", (_, prefs: IPreferences) => {
        store.set(prefs);
        return store.store;
    });
}
