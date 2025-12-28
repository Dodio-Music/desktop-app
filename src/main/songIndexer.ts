import {app, BrowserWindow, dialog, ipcMain} from "electron";
import path from "path";
import fsp from "fs/promises";
import fs from "fs";
import {parseFile} from "music-metadata";
import {createHash} from "node:crypto";
import sharp from "sharp";
import pLimit from "p-limit";
import {LocalSongEntry, SongDirectoryResponse} from "../shared/TrackInfo.js";
import {getPreferences, setPreferences} from "./preferences.js";

const LOG_BENCHMARK = false;
let mainWindow: BrowserWindow | null = null;

export interface CachedSongMetadata {
    id: string;
    path: string;
    mTimeMs: number;
    metadata: LocalSongEntry;
}

const cachePath = path.join(app.getPath("userData"), "metadata-cache.json");

interface MetadataCache {
    [id: string]: CachedSongMetadata;
}

let metadataCache: MetadataCache = {};

async function loadMetadataCache() {
    try {
        const file = await fsp.readFile(cachePath, "utf8");
        metadataCache = JSON.parse(file);
    } catch {
        metadataCache = {};
    }
}

async function saveMetadataCache() {
    await fsp.writeFile(
        cachePath,
        JSON.stringify(metadataCache, null, 2),
        "utf8"
    );
}

export const registerSongIndexer = (window: BrowserWindow) => {
    mainWindow = window;
    ipcMain.handle("songs:start-scan", () => {
        void scanFolder();
        return true;
    });

    ipcMain.handle("songs:setdirectory", () => setSongDirectory());

    ipcMain.handle("songs:get-full-cover", async (_event, fullPath: string) => getFullCover(fullPath));
};

async function setSongDirectory() {
    if (!mainWindow) return;
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"]
    });
    if (result.canceled) {
        return;
    }
    setPreferences({localFilesDir: result.filePaths[0]});
}

async function scanFolder() {
    if (!mainWindow) return;

    const prefs = getPreferences();
    const folderPath = prefs.localFilesDir;

    const exists = folderPath !== undefined && fs.existsSync(folderPath);
    if (!exists) {
        mainWindow.webContents.send("songs:basic", {success: false, error: "You haven't set a song directory yet."});
        mainWindow.webContents.send("songs:scan-done");
        return;
    }
    const timestamp = performance.now();

    const supportedExts = [".mp3", ".flac", ".wav", ".ogg", ".opus"];
    const files = await fsp.readdir(folderPath, {withFileTypes: true});

    const list = await Promise.all(
        files
            .filter(f => f.isFile() && supportedExts.includes(path.extname(f.name).toLowerCase()))
            .map(async f => {
                const fullPath = path.join(folderPath, f.name);
                const stat = await fsp.stat(fullPath);
                return {
                    id: "",
                    needsMetadata: false,
                    mTimeMs: 0,
                    name: f.name,
                    fullPath,
                    createdAt: stat.birthtime,
                    size: stat.size
                };
            })
    );

    mainWindow.webContents.send("songs:count", list.length);

    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    await loadMetadataCache();

    for (const file of list) {
        const id = await computeContentId(file.fullPath);

        const stat = await fsp.stat(file.fullPath);
        const mTimeMs = stat.mtimeMs;

        const cached = metadataCache[id];
        const hasValidCache = cached && cached.mTimeMs === mTimeMs;

        const songDirectoryResponse: SongDirectoryResponse = {
            success: true,
            song: {
                id,
                type: "local",
                title: file.name.substring(0, file.name.lastIndexOf(".")) || file.name,
                artists: ["Unknown Artist"],
                album: "Unknown Album",
                fileName: file.name,
                fullPath: file.fullPath,
                duration: 0,
                picture: undefined,
                createdAt: file.createdAt
            }
        };

        mainWindow.webContents.send("songs:basic", songDirectoryResponse);

        if (hasValidCache) {
            const cachedMeta = cached.metadata;
            if (cachedMeta.picture) {
                const id = cachedMeta.id;
                const picturePath = path.join(app.getPath("userData"), "thumbnails", id + ".png");

                const exists = await fsp.access(picturePath).then(() => true).catch(() => false);
                if (!exists) {
                    file.needsMetadata = true;
                    file.id = id;
                    file.mTimeMs = mTimeMs;
                    continue;
                }
            }

            mainWindow.webContents.send("songs:metadata", {
                success: true,
                song: cached.metadata
            });
            continue;
        }

        file.needsMetadata = true;
        file.id = id;
        file.mTimeMs = mTimeMs;
    }

    if (LOG_BENCHMARK) console.log(`Loaded local files basic info in ${Math.round(performance.now() - timestamp)}ms.`);

    const limit = pLimit(4);

    await Promise.all(
        list
            .filter(f => f.needsMetadata)
            .map(f => limit(async () => {
                    try {
                        if (!mainWindow) return;

                        const metadata = await parseFile(f.fullPath);
                        const common = metadata.common;

                        let pictureUrl: string | undefined;
                        if (common.picture && common.picture.length > 0) {
                            const pic = common.picture[0];
                            pictureUrl = await getThumbnail(f.id, pic.data);
                        }

                        const finalMeta: LocalSongEntry = {
                            id: f.id,
                            type: "local",
                            fileName: f.name,
                            fullPath: f.fullPath,
                            title: common.title || f.name.substring(0, f.name.lastIndexOf(".")) || f.name,
                            artists: common.artists || ["Unknown Artist"],
                            album: common.album || "Unknown Album",
                            duration: metadata.format.duration ?? 0,
                            picture: pictureUrl,
                            createdAt: f.createdAt
                        };

                        const songDirectoryResponse: SongDirectoryResponse = {
                            success: true,
                            song: finalMeta
                        };

                        metadataCache[f.id] = {
                            id: f.id,
                            path: f.fullPath,
                            mTimeMs: f.mTimeMs,
                            metadata: finalMeta
                        };

                        mainWindow.webContents.send("songs:metadata", songDirectoryResponse);

                    } catch (err) {
                        console.error(`Failed to read metadata for ${f.fullPath}: `, err);
                    }
                })
            )
    );

    mainWindow.webContents.send("songs:scan-done");

    if (LOG_BENCHMARK) console.log(`Loaded local files metadata in ${Math.round(performance.now() - timestamp)}ms.`);

    await saveMetadataCache();
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

async function computeContentId(fullPath: string): Promise<string> {
    const hash = createHash("sha256");
    const stream = fs.createReadStream(fullPath, {start: 0, end: 128 * 1024});
    const size = (await fsp.stat(fullPath)).size;

    return new Promise((resolve, reject) => {
        stream.on("data", chunk => hash.update(chunk));
        stream.on("end", () => {
            hash.update(`size:${size}`);
            resolve(hash.digest("hex"));
        });
        stream.on("error", reject);
    });
}

async function getFullCover(fullPath: string) {
    try {
        const metadata = await parseFile(fullPath);
        if (!metadata.common.picture?.length) return null;

        const pic = metadata.common.picture[0];
        const buffer = await sharp(pic.data).png().toBuffer();
        return `data:image/png;base64,${buffer.toString("base64")}`;
    } catch (err) {
        console.error("Failed to extract full cover:", err);
        return null;
    }
}
