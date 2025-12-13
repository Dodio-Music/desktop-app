import {ipcMain} from "electron";
import fs from "fs";
import path from "path";
import mime from "mime";

export interface UploadResponse {
    success: boolean;
    message: string;
}

export function registerDashboardIPC() {
    ipcMain.handle("dashboard:upload", (_, path) => processUpload(path));
}

const processUpload = async (filePath: string): Promise<UploadResponse> => {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        const mimeType = mime.getType(filePath) || "application/octet-stream";

        const formData = new FormData();
        formData.append("file", new Blob([fileBuffer], { type: mimeType }), fileName);

        const res = await fetch(process.env.DODIO_BACKEND_URL + "/admin/upload", {
            method: "POST",
            body: formData,
        });

        if (res.ok) {
            return {success: true, message: `File ${path.basename(filePath)} uploaded successfully`};
        } else {
            const text = await res.text();
            return {success: false, message: text};
        }
    } catch (err) {
        console.error("Upload failed:", err);
        return {success: false, message: "Error"};
    }
}
