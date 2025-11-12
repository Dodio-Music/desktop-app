import {app, BrowserWindow, dialog, ipcMain} from "electron";
import path from "path";
import fsp from "fs/promises";
import fs from "fs";
import {IAudioMetadata, parseFile} from "music-metadata";
import {setPreferences} from "./preferences.js";
import {createHash} from "node:crypto";
import sharp from "sharp";
import pLimit from "p-limit";
import {LocalSongEntry} from "../shared/TrackInfo.js";

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

async function simpleScan(folderPath: string): Promise<LocalSongEntry[] | null> {
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
                return {name: f.name, fullPath, createdAt: stat.birthtime, size: stat.size};
            })
    );

    basicInfo.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const limit = pLimit(4);

    const tracks = await Promise.all(
        basicInfo.map(f => limit(async () => {
            try {
                const metadata = await parseFile(f.fullPath);
                const common = metadata.common;

                const id = computeFastId(f.size, f.createdAt.getTime(), metadata);

                let pictureUrl: string | undefined;
                if (common.picture && common.picture.length > 0) {
                    const pic = common.picture[0];
                    pictureUrl = await getThumbnail(id, pic.data);
                }

                const entry: LocalSongEntry = {
                    id,
                    type: "local",
                    fileName: f.name,
                    fullPath: f.fullPath,
                    title: common.title || f.name,
                    artists: common.artists || ["Unknown Artist"],
                    album: common.album || "Unknown Album",
                    duration: metadata.format.duration || undefined,
                    picture: pictureUrl,
                    createdAt: f.createdAt
                }
                return entry;
            } catch (err) {
                console.error(`Failed to read metadata for ${f.fullPath}: `, err);
                return null;
            }
        }))
    );

    return tracks.filter(Boolean) as LocalSongEntry[];
}

async function getThumbnail(id: string, pictureBuffer: Uint8Array): Promise<string> {
    const thumbDir = path.join(app.getPath("userData"), "thumbnails");
    const thumbPath = path.join(thumbDir, id + ".png");

    await fsp.mkdir(thumbDir, {recursive: true});

    try {
        await fsp.access(thumbPath);
    } catch {
        const buffer = await sharp(pictureBuffer)
            .resize({width: 150, height: 150, fit: "inside"})
            .png()
            .toBuffer();

        fsp.writeFile(thumbPath, buffer).catch(err => console.error("Failed to cache thumbnail", err));
    }

    return `safe-file://thumbnails/${id}.png`;
}

function computeFastId(size: number, createdAt: number, metadata: IAudioMetadata) {
    const hash = createHash("sha256");
    hash.update(`${metadata.common.title ?? ""}`);
    hash.update(`${metadata.common.album ?? ""}`);
    hash.update(`${metadata.common.artists?.join(",") ?? ""}`);
    hash.update(`${size}-${createdAt}`);
    return hash.digest("hex");
}
