import {ipcMain} from "electron";
import api from "../web/dodio_api.js";
import {DodioApi} from "../../shared/Api.js";

export const registerDodioApiIPC = () => {
    ipcMain.handle("api:login", (_, ...args: Parameters<DodioApi["login"]>) => api.login(...args))
    ipcMain.handle("api:signup", (_, ...args: Parameters<DodioApi["signup"]>) => api.signup(...args))
    ipcMain.handle("api:authRequest", (_, method, ...args) => {
        return api.authRequest(method, ...args)
    });
    ipcMain.handle("api:logout", () => api.logout());
};
