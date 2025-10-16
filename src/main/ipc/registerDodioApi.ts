import {ipcMain} from "electron";
import api from "../web/dodio_api.js";
import {DodioApi} from "../../shared/Api.js";
import {AxiosResponse} from "axios";

export const registerDodioApiIPC = () => {
    ipcMain.handle("api:login", (_, ...args: Parameters<DodioApi["login"]>) => api.login(...args))
    ipcMain.handle("api:signup", (_, ...args: Parameters<DodioApi["signup"]>) => api.signup(...args))
    ipcMain.handle("api:authRequest", function(_, ...args): Promise<AxiosResponse|undefined> {
        //@ts-expect-error spread args are annoying
        return api.authRequest(...args)
    });
    ipcMain.handle("api:logout", () => api.logout());
};
