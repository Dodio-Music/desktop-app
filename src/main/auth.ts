import {app, BrowserWindow, ipcMain} from "electron";
import path from "path";
import fs from "fs/promises";
import {AuthInfo, AuthStatus, IAuthData} from "./web/Typing.js";
import {safeStorage} from "electron"
import {refreshAuthToken} from "./web/dodio_api.js";


export const authPath = path.join(app.getPath("userData"), "auth.json");

let authInfoCache: AuthInfo | null = null;

async function loadAuth(): Promise<IAuthData> {
    try {
        const data = await fs.readFile(authPath);
        const decrypted = safeStorage.decryptString(data);
        const parsed = JSON.parse(decrypted);
        return {
            hasAccount: parsed.hasAccount,
            access_token_expiry: new Date(Date.parse(parsed.access_token_expiry)),
            refresh_token_expiry: new Date(Date.parse(parsed.refresh_token_expiry)),
            refresh_token: parsed.refresh_token,
            access_token: parsed.access_token,
            email: parsed.email,
            username: parsed.username,
            role: parsed.role
        };
    } catch {
        return {hasAccount: false};
    }
}

export let auth: IAuthData | null = null;

export function updateAuth(new_auth: Partial<IAuthData>) {
    auth = {...auth, ...new_auth} as IAuthData;
    const authStatus: AuthStatus = auth.access_token || auth.refresh_token
        ? "account"
        : auth.hasAccount
            ? "login"
            : "signup";

    authInfoCache = {accessToken: auth.access_token ?? "", status: authStatus, role: auth.role, email: auth.email, username: auth.username};

    mainWindow.webContents.send("auth:statusChange", authInfoCache);

    const data = JSON.stringify(auth, null, 2);
    const encrypted = safeStorage.encryptString(data);
    fs.writeFile(authPath, encrypted)
        .catch(err => console.error("could not save auth data", err));
}
let mainWindow!: BrowserWindow;
export async function setupAuth(window: BrowserWindow) {
    mainWindow = window;
    updateAuth(await loadAuth());
    await refreshAuthToken();
}

ipcMain.handle("auth:get-initial-redux", () => {
    return authInfoCache;
});
