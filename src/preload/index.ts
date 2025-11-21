import {contextBridge, ipcRenderer} from "electron";
import {ElectronAPI, electronAPI} from "@electron-toolkit/preload";
import IpcRendererEvent = Electron.IpcRendererEvent;
import {PlayerEvent, PlayerState} from "../shared/PlayerState.js";
import {IPreferences} from "../main/preferences.js";
import {BaseSongEntry, LocalSongEntry, RemoteSongEntry, SongDirectoryResponse} from "../shared/TrackInfo.js";
import {ApiResult, AuthStatus, DodioApi, MayError, RequestMethods} from "../shared/Api.js";
import {AxiosInstance} from "axios";
import IpcRenderer = Electron.IpcRenderer;

export interface CustomWindowControls {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => IpcRenderer;
    isMaximized: () => Promise<boolean>;
}

const LOG_ALL_IPC_EVENTS = false;

if(LOG_ALL_IPC_EVENTS) {
    const _send = ipcRenderer.send.bind(ipcRenderer);
    const _invoke = ipcRenderer.invoke.bind(ipcRenderer);
    const _on = ipcRenderer.on.bind(ipcRenderer);
    const _once = ipcRenderer.once.bind(ipcRenderer);

    ipcRenderer.send = (channel, ...args) => {
        console.log("[ipcRenderer.send]", channel, args);
        return _send(channel, ...args);
    };

    ipcRenderer.invoke = (channel, ...args) => {
        console.log("[ipcRenderer.invoke]", channel, args);
        return _invoke(channel, ...args);
    };

    ipcRenderer.on = (channel, listener) => {
        console.log("[ipcRenderer.on]", channel);
        return _on(channel, (event, ...args) => {
            console.log("[ipcRenderer received]", channel, args);
            listener(event, ...args);
        });
    };

    ipcRenderer.once = (channel, listener) => {
        console.log("[ipcRenderer.once]", channel);
        return _once(channel, (event, ...args) => {
            console.log("[ipcRenderer received once]", channel, args);
            listener(event, ...args);
        });
    };
}

const windowControls: CustomWindowControls = {
    minimize: () => ipcRenderer.send("window-minimize"),
    maximize: () => ipcRenderer.send("window-maximize"),
    close: () => ipcRenderer.send("window-close"),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
        const listener = (_: unknown, isMaximized: boolean) => callback(isMaximized);
        ipcRenderer.on("maximize-change", listener);
        return () => ipcRenderer.removeListener("maximize-change", listener);
    },
    isMaximized: () => ipcRenderer.invoke("window-is-maximized")
};

const api = {
    startSongScan: () => ipcRenderer.invoke("songs:start-scan"),
    onSongBasic: (cb: (song: SongDirectoryResponse) => void) => {
        const handler = (_ev: Electron.IpcRendererEvent, res: SongDirectoryResponse) => cb(res);
        ipcRenderer.on("songs:basic", handler);
        return () => ipcRenderer.removeListener("songs:basic", handler);
    },
    onSongMetadata: (cb: (song: SongDirectoryResponse) => void) => {
        const handler = (_ev: Electron.IpcRendererEvent, res: SongDirectoryResponse) => cb(res);
        ipcRenderer.on("songs:metadata", handler);
        return () => ipcRenderer.removeListener("songs:metadata", handler);
    },
    onSongScanDone: (cb: () => void) => {
        const handler = () => cb();
        ipcRenderer.on("songs:scan-done", handler);
        return () => ipcRenderer.removeListener("songs:scan-done", handler);
    },
    loadTrack: (track: LocalSongEntry, contextTracks: BaseSongEntry[]) => ipcRenderer.invoke("player:load-local", track, contextTracks),
    loadTrackRemote: (track: RemoteSongEntry, contextTracks: RemoteSongEntry[]) => ipcRenderer.invoke("player:load-remote", track, contextTracks),
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
    onPreferencesUpdated: (callback: (prefs?: IPreferences) => void) => {
        const handler = (_ev: IpcRendererEvent, prefs?: IPreferences) => callback(prefs);
        ipcRenderer.on("preferences:update", handler);
        return () => ipcRenderer.removeListener("preferences:update", handler);
    },
    showLocalFilesDialog: () => ipcRenderer.invoke("songs:setdirectory"),
    onAuthUpdate: (cb: (data: AuthStatus) => void) => {
        authUpdateCallback = cb;
        if(authStatusCache !== null) cb(authStatusCache);
    },
    getAuthStatus: () => ipcRenderer.invoke("auth:getStatus"),
    authRequest<M extends RequestMethods, T = unknown>(method: M, ...args: Parameters<AxiosInstance[M]>) {
        return ipcRenderer.invoke("api:authRequest", method, ...args) as Promise<ApiResult<T>>;
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
