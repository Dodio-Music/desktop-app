import {app, BrowserWindow, dialog, ipcMain} from "electron";
import path from "path";
import fsp from "fs/promises";
import fs from "fs";
import {parseFile} from "music-metadata";
import {setPreferences} from "./preferences.js";
import {createHash} from "node:crypto";
import sharp from "sharp";
import pLimit from "p-limit";

export interface SongEntry {
    name: string;
    fullPath: string;
    title: string;
    artists: string[];
    album: string;
    track?: number;
    duration?: number;
    picture?: string;
    createdAt: Date;
}

export const registerSongIndexer = (mainWindow: BrowserWindow) => {
    ipcMain.handle("songs:list", async (_, folderPath: string) => {
        return await simpleScan(folderPath);
    });

    ipcMain.handle("songs:setdirectory", () => setSongDirectory(mainWindow));
};

async function setSongDirectory(mainWindow: BrowserWindow) {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"]
    });
    if (result.canceled) {
        return;
    }
    await setPreferences({localFilesDir: result.filePaths[0]});
    mainWindow.webContents.send("preferences:update");
}

async function simpleScan(folderPath: string): Promise<SongEntry[] | null> {
    const exists = fs.existsSync(folderPath);
    if (!exists) return null;

    const files = await fsp.readdir(folderPath, {withFileTypes: true});
    const supportedExts = [".mp3", ".flac", ".wav", ".ogg"];

    const basicInfo = await Promise.all(
        files
            .filter(f => f.isFile() && supportedExts.includes(path.extname(f.name).toLowerCase()))
            .map(async f => {
                const fullPath = path.join(folderPath, f.name);
                const stat = await fsp.stat(fullPath);
                return {name: f.name, fullPath, createdAt: stat.birthtime};
            })
    );

    basicInfo.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const limit = pLimit(4);

    const tracks = await Promise.all(
        basicInfo.map(f => limit(async () => {
            try {
                const metadata = await parseFile(f.fullPath);
                const common = metadata.common;

                let pictureBase64: string | undefined;
                if (common.picture && common.picture.length > 0) {
                    const pic = common.picture[0];
                    pictureBase64 = await getThumbnail(f.fullPath, pic.data);
                }

                return {
                    name: f.name,
                    fullPath: f.fullPath,
                    title: common.title || f.name,
                    artists: common.artists || ["Unknown Artist"],
                    album: common.album || "Unknown Album",
                    track: common.track.no || undefined,
                    duration: metadata.format.duration || undefined,
                    picture: pictureBase64,
                    createdAt: f.createdAt
                } as SongEntry;
            } catch (err) {
                console.error(`Failed to read metadata for ${f.fullPath}: `, err);
                return null;
            }
        }))
    );

    return tracks.filter(Boolean) as SongEntry[];
}

async function getThumbnail(fullPath: string, pictureBuffer: Uint8Array): Promise<string> {
    const hash = createHash("sha256").update(fullPath).digest("hex");
    const thumbDir = path.join(app.getPath("userData"), "thumbnails");
    const thumbPath = path.join(thumbDir, hash + ".png");

    await fsp.mkdir(thumbDir, {recursive: true});

    try {
        const existing = await fsp.readFile(thumbPath);
        return `data:image/png;base64,${existing.toString("base64")}`;
    } catch {
        const buffer = await sharp(pictureBuffer)
            .resize({width: 150, height: 150, fit: "inside"})
            .png()
            .toBuffer();

        fsp.writeFile(thumbPath, buffer).catch(err => console.error("Failed to cache thumbnail", err));

        return `data:image/png;base64,${buffer.toString("base64")}`;
    }
}
