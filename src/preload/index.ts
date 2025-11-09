import {contextBridge, ipcRenderer} from "electron";
import {ElectronAPI, electronAPI} from "@electron-toolkit/preload";
import IpcRendererEvent = Electron.IpcRendererEvent;
import {PlayerEvent, PlayerState} from "../shared/PlayerState.js";
import {IPreferences} from "../main/preferences.js";
import {BaseSongEntry, LocalSongEntry, RemoteSongEntry} from "../shared/TrackInfo.js";
import {ApiResult, AuthStatus, DodioApi, MayError, RequestMethods} from "../shared/Api.js";
import {AxiosInstance, AxiosResponse} from "axios";

export interface CustomWindowControls {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => void;
    isMaximized: () => Promise<boolean>;
}

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
    loadTrack: (track: LocalSongEntry, contextTracks: BaseSongEntry[]) => ipcRenderer.invoke("player:load-local", track, contextTracks),
    loadTrackRemote: (trackInfo: RemoteSongEntry) => ipcRenderer.invoke("player:load-remote", trackInfo),
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
    onAuthUpdate: (cb: (data: AuthStatus) => void) => {
        authUpdateCallback = cb;
        if(authStatusCache !== null) cb(authStatusCache);
    },
    authRequest<M extends RequestMethods, T = unknown>(method: M, ...args: Parameters<AxiosInstance[M]>) {
        return ipcRenderer.invoke("api:authRequest", method, ...args) as Promise<ApiResult<AxiosResponse<T>>>;
    },
    login: (login: string, password: string) => ipcRenderer.invoke("api:login", login, password) as Promise<MayError>,
    signup: (username: string, email: string, password: string) => ipcRenderer.invoke("api:signup", username, email, password) as Promise<MayError>,
    logout: () => ipcRenderer.invoke("api:logout") as Promise<MayError>,
    onPlayerEvent: (callback: (event: PlayerEvent) => void) => {
        const listener = (_: IpcRendererEvent, event: PlayerEvent) => callback(event);
        ipcRenderer.on("player:event", listener);
        return () => ipcRenderer.removeListener("player:event", listener);
    },
    onPlayerUpdate: (callback: (event: PlayerState) => void) => {
        const listener = (_: IpcRendererEvent, event: PlayerState) => callback(event);
        ipcRenderer.on("player:update", listener);
        return () => ipcRenderer.removeListener("player:update", listener);
    },
    nextTrack: () => ipcRenderer.invoke("player:next"),
    previousTrack: () => ipcRenderer.invoke("player:previous")
} satisfies DodioApi & Record<string, unknown>;

let authUpdateCallback: ((data: AuthStatus) => void) | null = null;

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
