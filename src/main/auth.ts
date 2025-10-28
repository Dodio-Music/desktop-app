import {app, BrowserWindow} from "electron";
import path from "path";
import fs from "fs/promises";
import {IAuthData} from "./web/Typing.js";
import {safeStorage} from "electron"
import {AuthStatus} from "../shared/Api.js";
import {refreshAuthToken} from "./web/dodio_api.js";

export const authPath = path.join(app.getPath("userData"), "auth.json");

async function loadAuth(): Promise<IAuthData> {
    try {
        const data = await fs.readFile(authPath);
        const decrypted = safeStorage.decryptString(data);
        const parsed = JSON.parse(decrypted);
        console.log("loaded auth:", parsed)
        return {
            hasAccount: parsed.hasAccount,
            access_token_expiry: new Date(Date.parse(parsed.access_token_expiry)),
            refresh_token_expiry: new Date(Date.parse(parsed.refresh_token_expiry)),
            refresh_token: parsed.refresh_token,
            access_token: parsed.access_token
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
    console.log("new auth status", authStatus);
    mainWindow.webContents.send("auth:statusChange",authStatus);
    const data = JSON.stringify(new_auth, null, 2);
    console.log("writing auth:", data);
    const encrypted = safeStorage.encryptString(data);
    fs.writeFile(authPath, encrypted)
        .then(() => console.log("Saved auth"))
        .catch(err => console.error("could not save auth data", err));
}
let mainWindow: BrowserWindow;
export async function setupAuth(window: BrowserWindow) {
    console.log("Setup auth")
    mainWindow = window;
    updateAuth(await loadAuth());
    await refreshAuthToken();
}
