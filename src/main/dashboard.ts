import {BrowserWindow, ipcMain} from "electron";
import fs from "fs";
import path from "path";
import mime from "mime";
import FormData from "form-data";
import got, {HTTPError} from "got";
import {auth} from "./auth.js";

export interface UploadResponse {
    fileName: string;
    success: boolean;
    message: string;
}

export interface UploadProgress {
    percent: number;
    fileName: string;
}

export function registerDashboardIPC(mainWindow: BrowserWindow) {
    ipcMain.handle("dashboard:upload", (_, path) => processUpload(path, mainWindow));
}

export async function processUpload(filePath: string, mainWindow: BrowserWindow): Promise<UploadResponse> {
    return new Promise((resolve) => {
        const fileName = path.basename(filePath);
        const mimeType = mime.getType(filePath) ?? "application/octet-stream";

        const form = new FormData();
        form.append("file", fs.createReadStream(filePath), {
            filename: fileName,
            contentType: mimeType,
        });

        const stream = got.stream.post(
            `${process.env.DODIO_BACKEND_URL}/admin/upload`,
            {
                body: form,
                headers: {
                    Authorization: `Bearer ${auth?.access_token}`
                }
            }
        );

        stream.on("uploadProgress", (progress) => {
            mainWindow.webContents.send("dashboard:upload-progress", {
                fileName,
                percent: Math.round(progress.percent * 100),
            });
        });

        stream.on("response", async () => {
            resolve({ success: true, message: "Track uploaded successfully!", fileName });
        });

        /* eslint-disable  @typescript-eslint/no-explicit-any */
        stream.on("error", async (err: any) => {
            if (err instanceof HTTPError && err.response) {
                const body = await err.response.body;

                resolve({
                    success: false,
                    message: body,
                    fileName,
                });
                return;
            }

            resolve({
                success: false,
                message: err.message ?? "Unknown error",
                fileName,
            });
        });
    });
}
