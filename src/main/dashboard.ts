import {BrowserWindow, ipcMain} from "electron";
import fs from "fs";
import path from "path";
import mime from "mime";
import FormData from "form-data";
// @ts-ignore TS seems to be unable to resolve the 'got' package
import got, {HTTPError} from "got";
import {auth} from "./auth.js";
import {UploadState} from "../shared/adminApi.ts";

let mainWindow: BrowserWindow = null!;

export function registerDashboardIPC(window: BrowserWindow) {
    mainWindow = window;
    ipcMain.handle("dashboard:uploads:post", (_, path) => handleUpload(path));
    ipcMain.handle("dashboard:uploads:get", getUploads);
    ipcMain.handle("dashboard:uploads:delete", (_, fileName) => deleteUpload(fileName));
}

export function handleUpload(filePath: string) {
    const fileName = path.basename(filePath);
    const mimeType = mime.getType(filePath) ?? "application/octet-stream";

    setUpload({fileName, percent: 0, status: "uploading"});

    const form = new FormData();
    form.append("file", fs.createReadStream(filePath), {
        filename: fileName,
        contentType: mimeType
    });

    const stream = got.stream.post(
        `${process.env.DODIO_BACKEND_URL}/admin/upload`,
        {
            body: form,
            headers: {
                Authorization: `Bearer ${auth?.accessToken}`
            }
        }
    );

    stream.on("uploadProgress", (progress) => {
        const percent = Math.round(progress.percent * 100);
        updateUpload(fileName, {percent});
    });

    stream.on("response", async () => {
        updateUpload(fileName, {
            percent: 100,
            status: "success",
            message: "Track uploaded successfully!"
        });
    });

    /* eslint-disable  @typescript-eslint/no-explicit-any */
    stream.on("error", async (err: any) => {
        if (err instanceof HTTPError && err.response) {
            const body = await err.response.body;

            if (err.response.statusCode === 403) {
                updateUpload(fileName, {
                    status: "error",
                    message: "Forbidden! Try logging in again!"
                });
            }

            updateUpload(fileName, {
                status: "error",
                message: body
            });
            return;
        }

        updateUpload(fileName, {
            status: "error",
            message: err.message ?? "Unknown error"
        });
    });
}


// upload manager

const uploads = new Map<string, UploadState>();

function getUploads() {
    return Object.fromEntries(uploads.entries());
}

function setUpload(state: UploadState) {
    uploads.set(state.fileName, state);
    mainWindow.webContents.send("dashboard:uploads:progress", state);
}

function deleteUpload(fileName: string) {
    return uploads.delete(fileName);
}

function updateUpload(fileName: string, partial: Partial<UploadState>) {
    const existing = uploads.get(fileName);
    if (!existing) return;
    const updated = {...existing, ...partial};
    setUpload(updated);
}
