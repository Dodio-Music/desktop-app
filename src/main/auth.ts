import {app, BrowserWindow, ipcMain} from "electron";
import path from "path";
import fs from "fs/promises";
import {
    AuthStatus,
    IAuthData,
    RefreshTokenResponse,
    RendererAuthInfo,
    SerializedAuth,
    SignInResponse
} from "./web/Typing.js";
import {safeStorage} from "electron"
import {refreshAuthToken} from "./web/dodio_api.js";


export const authPath = path.join(app.getPath("userData"), "auth.json");

let authInfoCache: RendererAuthInfo | null = null;

function serializeAuth(auth: IAuthData): SerializedAuth {
    return {
        ...auth,
        accessTokenExpirationDate: auth.accessTokenExpirationDate?.toISOString(),
        refreshTokenExpirationDate: auth.refreshTokenExpirationDate?.toISOString()
    };
}

function deserializeAuth(data: SerializedAuth): IAuthData {
    return {
        ...data,
        accessTokenExpirationDate: data.accessTokenExpirationDate ? new Date(data.accessTokenExpirationDate) : undefined,
        refreshTokenExpirationDate: data.refreshTokenExpirationDate ? new Date(data.refreshTokenExpirationDate) : undefined
    };
}

async function loadAuth(): Promise<IAuthData> {
    try {
        const data = await fs.readFile(authPath);
        const decrypted = safeStorage.decryptString(data);
        const parsed = JSON.parse(decrypted);

        return deserializeAuth(parsed);
    } catch {
        return {};
    }
}

export let auth: IAuthData = {};

function updateAuth(new_auth: Partial<IAuthData>) {
    auth = {
        ...auth,
        ...new_auth
    };

    const authStatus: AuthStatus = auth.accessToken ? "logged_in" : "no_account";
    authInfoCache = {
        accessToken: auth.accessToken,
        accessTokenExpiry: auth.accessTokenExpirationDate?.toISOString(),
        status: authStatus,
        role: auth.role,
        email: auth.email,
        username: auth.username,
        displayName: auth.displayName
    };
    mainWindow.webContents.send("auth:statusChange", authInfoCache);

    const serialized = serializeAuth(auth);
    const encrypted = safeStorage.encryptString(JSON.stringify(serialized, null, 2));
    fs.writeFile(authPath, encrypted).catch(err => console.error("could not save auth data", err));
}
let mainWindow!: BrowserWindow;
export async function setupAuth(window: BrowserWindow) {
    mainWindow = window;
    updateAuth(await loadAuth());
    await refreshAuthToken();
}

export function applyRefresh(res: RefreshTokenResponse) {
    updateAuth({
        ...res,
        accessTokenExpirationDate: new Date(res.accessTokenExpirationDate)
    });
}

export function applyLogin(res: SignInResponse) {
    updateAuth({
        ...res,
        accessTokenExpirationDate: new Date(res.accessTokenExpirationDate),
        refreshTokenExpirationDate: new Date(res.refreshTokenExpirationDate)
    });
}

export function clearAuth() {
    updateAuth({
        accessToken: undefined,
        accessTokenExpirationDate: undefined,
        refreshToken: undefined,
        refreshTokenExpirationDate: undefined,
        username: undefined,
        displayName: undefined,
        email: undefined,
        role: undefined
    });
}

export function removeAccessToken() {
    updateAuth({accessToken: undefined, accessTokenExpirationDate: undefined});
}

ipcMain.handle("auth:get-initial-redux", () => {
    return authInfoCache;
});

ipcMain.handle("auth:refresh", async () => {
    return (await refreshAuthToken());
})
