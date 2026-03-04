import {app, dialog} from "electron";
import electronUpdater, { type AppUpdater } from "electron-updater";

export function getAutoUpdater(): AppUpdater {
    const { autoUpdater } = electronUpdater;
    return autoUpdater;
}

export const registerUpdater = () => {
    getAutoUpdater().autoDownload = true;

    void getAutoUpdater().checkForUpdates();

    getAutoUpdater().on("update-downloaded", (info) => {
        dialog
            .showMessageBox({
                type: "info",
                buttons: ["Install and relaunch", "Remind me later"],
                title: "Dodio",
                message: `A new version of Dodio is available!`,
                detail: `${app.getVersion()} → ${info.version}

Would you like to install it now?`
            })
            .then(result => {
                if (result.response === 0) {
                    getAutoUpdater().quitAndInstall();
                }
            });
    });
}
