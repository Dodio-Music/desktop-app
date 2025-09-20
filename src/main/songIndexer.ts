import {BrowserWindow, ipcMain} from "electron";
import path from "path";
import fsp from "fs/promises";
import fs from "fs";
import {parseFile} from "music-metadata";
import {dialog} from "electron";
import {store} from "./preferences.js";

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
    if(result.canceled) {
        return;
    }
    store.set("localFilesDir", result.filePaths[0]);
    mainWindow.webContents.send("preferences:update");
}

async function simpleScan(folderPath: string): Promise<SongEntry[] | null> {
    const exists = fs.existsSync(folderPath);
    if(!exists) return null;

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

    const tracks: SongEntry[] = [];

    for(const f of basicInfo) {
        try {
            const metadata = await parseFile(f.fullPath);
            const common = metadata.common;

            let pictureBase64: string | undefined;
            if(common.picture && common.picture.length > 0) {
                const pic = common.picture[0];
                pictureBase64 = `data:${pic.format};base64,${Buffer.from(pic.data).toString("base64")}`;
            }

            tracks.push({
                name: f.name,
                fullPath: f.fullPath,
                title: common.title || f.name,
                artists: common.artists || ["Unknown Artist"],
                album: common.album || "Unknown Album",
                track: common.track.no || undefined,
                duration: metadata.format.duration || undefined,
                picture: pictureBase64,
                createdAt: f.createdAt
            })
        } catch(err) {
            console.error(`Failed to read metadata for ${f.fullPath}: `, err);
        }
    }

    return tracks;
}
