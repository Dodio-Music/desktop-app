import {contextBridge, ipcRenderer} from "electron";
import {ElectronAPI, electronAPI} from "@electron-toolkit/preload";
import IpcRendererEvent = Electron.IpcRendererEvent;
import {PlayerState} from "../shared/PlayerState.js";
import {IPreferences} from "../main/preferences.js";
import {TrackInfo} from "../shared/TrackInfo.js";
import {AuthStatus, DodioApi, RequestMethods} from "../shared/Api.js";
import {AxiosInstance, AxiosResponse} from "axios";

export interface CustomWindowControls {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => void;
    isMaximized: () => Promise<boolean>;
}


console.log("DeineMamer")

const windowControls: CustomWindowControls = {
    minimize: () => ipcRenderer.send("window-minimize"),
    maximize: () => ipcRenderer.send("window-maximize"),
    close: () => ipcRenderer.send("window-close"),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) =>
        ipcRenderer.on("window-is-maximized", (_, isMaximized) => callback(isMaximized)),
    isMaximized: () => ipcRenderer.invoke("window-is-maximized")
};

const api = {
    listLocalSongs: async(folderPath: string) => await ipcRenderer.invoke("songs:list", folderPath),
    loadTrack: (songPath: string) => ipcRenderer.invoke("player:load-local", songPath),
    loadTrackRemote: (trackInfo: TrackInfo) => ipcRenderer.invoke("player:load-remote", trackInfo),
    pauseOrResume: () => ipcRenderer.invoke("player:pause-or-resume"),
    setVolume: (volume: number) => ipcRenderer.invoke("player:set-volume", volume),
    seek: (time: number) => ipcRenderer.invoke("player:seek", time),
    zoomIn: () => ipcRenderer.invoke("zoom:in"),
    zoomOut: () => ipcRenderer.invoke("zoom:out"),
    resetZoom: () => ipcRenderer.invoke("zoom:reset"),
    getZoom: (): Promise<number> => ipcRenderer.invoke("zoom:get"),
    dodioApi: <T extends keyof DodioApi>(request: T, ...args: Parameters<DodioApi[T]>) => ipcRenderer.invoke("api:"+request, ...args),
    onZoomFactorChanged: (cb: (factor: number) => void) => {
        const handler = (_ev: IpcRendererEvent, factor: number) => cb(factor);
        ipcRenderer.on("zoom-factor-changed", handler);
        return () => ipcRenderer.removeListener("zoom-factor-changed", handler);
    },
    getPreferences: (): Promise<IPreferences> => ipcRenderer.invoke("preferences:get"),
    setPreferences: (pref: Partial<IPreferences>) => ipcRenderer.invoke("preferences:set", pref),
    onPreferencesUpdated: (callback: () => void) => {
        const handler = () => callback();
        ipcRenderer.on("preferences:update", handler);
        return () => ipcRenderer.removeListener("preferences:update", handler);
    },
    showLocalFilesDialog: () => ipcRenderer.invoke("songs:setdirectory"),
    onWaveformData: (cb: (peaks: number[]) => void) => {
        const handler = (_ev: IpcRendererEvent, peaks: number[]) => cb(peaks);
        ipcRenderer.on("waveform:data", handler);
        return () => ipcRenderer.removeListener("waveform:data", handler);
    },
    onPlayerUpdate: (cb: (data: PlayerState) => void) => {
        playerUpdateCallback = cb;
    },
    onAuthUpdate: (cb: (data: AuthStatus) => void) => {
        authUpdateCallback = cb;
        if(authStatusCache !== null) cb(authStatusCache);
    },
    onTrackChange: (cb: () => void) => {
        const handler = () => cb();
        ipcRenderer.on("player:track-change", handler);
        return () => ipcRenderer.removeListener("player:track-change", handler);
    },
    authRequest<M extends RequestMethods, T = unknown>(method: M, ...args: Parameters<AxiosInstance[M]>): Promise<AxiosResponse<T>|undefined> {
        return ipcRenderer.invoke("api:authRequest", method, ...args);
    },
    login(login: string, password: string): Promise<boolean> { return ipcRenderer.invoke("api:login", login, password); },
    signup: (username: string, email: string, password: string): Promise<boolean> => ipcRenderer.invoke("api:signup", username, email, password),
    logout: (): Promise<boolean> => ipcRenderer.invoke("api:logout"),
    onLoadingProgress: (callback: (progress: number) => void) => {
        const handler = (_: IpcRendererEvent, progress: number) => callback(progress);
        ipcRenderer.on("player:loading-progress", handler);
        return () => ipcRenderer.removeListener("player:loading-progress", handler);
    }
};

let playerUpdateCallback: ((data: PlayerState) => void) | null = null;
let authUpdateCallback: ((data: AuthStatus) => void) | null = null;

ipcRenderer.on("player:update", (_event, data) => {
    if(playerUpdateCallback) playerUpdateCallback(data);
});

let authStatusCache: AuthStatus | null = null;
ipcRenderer.on("auth:statusChange", (_event, newStatus: AuthStatus) => {
    if(authUpdateCallback === null) authStatusCache = newStatus;
    else authUpdateCallback(newStatus)
});

export type ApiType = typeof api;

contextBridge.exposeInMainWorld("electron", {
    ...(electronAPI as ElectronAPI),
    ...windowControls
});

contextBridge.exposeInMainWorld("api", {
    ...api
});
