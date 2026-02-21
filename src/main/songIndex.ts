import {LocalSongEntry, SongDirectoryResponse} from "../shared/TrackInfo.js";
import {app, BrowserWindow, dialog, ipcMain} from "electron";
import path from "path";
import fsp from "fs/promises";
import {getPreferences, setPreferences} from "./preferences.js";
import fs from "fs";
import pLimit from "p-limit";
import sharp from "sharp";
import {createHash} from "node:crypto";
import {parseFile} from "music-metadata";
import {FSWatcher, watch} from "chokidar";

export interface CachedSongMetadata {
    id: string;
    path: string;
    mTimeMs: number;
    metadata: Omit<LocalSongEntry, "context">;
}

type MetadataCache = Record<string, CachedSongMetadata>;

const index = new Map<string, CachedSongMetadata>();
let watcher: FSWatcher | null = null;
let mainWindow: BrowserWindow | undefined;
let error: string = "";
let songCount = 0;

const cachePath = path.join(app.getPath("userData"), "metadata-cache.json");
const supportedExts = new Set([".mp3", ".flac", ".wav", ".ogg", ".opus"]);

/* ---------- CACHE READ/WRITE ---------- */

async function loadCache(): Promise<MetadataCache> {
    try {
        return JSON.parse(await fsp.readFile(cachePath, "utf8"));
    } catch {
        return {};
    }
}

async function saveCache() {
    const obj: MetadataCache = {};
    for(const [id, entry] of index) obj[id] = entry;
    await fsp.writeFile(cachePath, JSON.stringify(obj, null, 2), "utf8");
}

/* ---------- INDEXING ---------- */

async function resetFileIndex(dir: string) {
    const cached = await loadCache();
    const limit = pLimit(4);
    const files = await fsp.readdir(dir, {withFileTypes: true});

    const seenPaths = new Set<string>();

    await Promise.all(
        files
            .filter(f => f.isFile() && supportedExts.has(path.extname(f.name).toLowerCase()))
            .map(f =>
                limit(async () => {
                    const fullPath = path.join(dir!, f.name);
                    seenPaths.add(fullPath);

                    const stat = await fsp.stat(fullPath);
                    const id = await computeContentId(fullPath);

                    const cachedEntry = cached[id];
                    if(cachedEntry && cachedEntry.mTimeMs === stat.mtimeMs) {
                        index.set(id, cachedEntry);
                        return;
                    }

                    const entry = await buildMetadata(id, fullPath, stat);
                    index.set(id, entry);
                })
            )
    );

    // remove potentially deleted files
    for(const [id, entry] of Object.entries(cached)) {
        if(!seenPaths.has(entry.path)) {
            index.delete(id);
        }
    }

    await saveCache();
    error = "";
}

async function buildMetadata(id: string, fullPath: string, stat: fs.Stats): Promise<CachedSongMetadata> {
    const metadata = await parseFile(fullPath);
    const common = metadata.common;

    let picture: string | undefined;
    if(common.picture?.length) {
        picture = await getThumbnail(id, common.picture[0].data);
    }

    const song: Omit<LocalSongEntry, "context"> = {
        id,
        type: "local",
        fileName: path.basename(fullPath),
        fullPath,
        title: common.title ?? path.basename(fullPath, path.extname(fullPath)),
        artists: common.artists ?? ["Unknown Artist"],
        album: common.album ?? "Unknown Album",
        duration: metadata.format.duration ?? 0,
        picture,
        createdAt: stat.birthtime.toISOString()
    };

    return {
        id,
        path: fullPath,
        mTimeMs: stat.mtimeMs,
        metadata: song
    }
}

/* ---------- WATCHER ---------- */

function updateSongCount() {
    songCount = index.size;
    mainWindow?.webContents.send("songs:count", songCount);
}

function resetWatcher(dir: string) {
    watcher?.close();

    watcher = watch(dir, {
        ignoreInitial: true,
        depth: 0,
        awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 100
        }
    });

    watcher.on("add", async file => {
        if(!supportedExts.has(path.extname(file))) return;
        const stat = await fsp.stat(file);
        const id = await computeContentId(file);
        const entry = await buildMetadata(id, file, stat);
        index.set(id, entry);
        updateSongCount();
        await saveCache();
        emitAllSongs();
    });

    watcher.on("change", async file => {
        if (!supportedExts.has(path.extname(file))) return;

        let stat: fs.Stats;
        try {
            stat = await fsp.stat(file);
        } catch {
            return;
        }

        if (stat.size === 0) return;

        const existing = [...index.values()].find(e => e.path === file);
        if (existing && existing.mTimeMs === stat.mtimeMs) return;

        // remove old entry for path
        for (const [id, entry] of index) {
            if (entry.path === file) {
                index.delete(id);
                break;
            }
        }

        const id = await computeContentId(file);
        const entry = await buildMetadata(id, file, stat);

        index.set(id, entry);
        await saveCache();
        emitAllSongs();
    });

    watcher.on("unlink", async (file) => {
        let removed = false;

        for (const [id, entry] of index) {
            if (entry.path === file) {
                index.delete(id);
                removed = true;
                break;
            }
        }

        if (removed) {
            await saveCache();
            emitAllSongs();
        }

        updateSongCount();
    });
}

/* ---------- IPC ---------- */

export function registerSongIndexIPC(window: BrowserWindow) {
    mainWindow = window;

    ipcMain.handle("songs:get-all", () => emitAllSongs());
    ipcMain.handle("songs:setdirectory", () => setSongDirectory());
    ipcMain.handle("songs:get-full-cover", async(_e, fullPath: string) => getFullCover(fullPath));
    ipcMain.handle("songs:get-count", () => index.size);

    void resetIndex();
}

const resetIndex = async () => {
    const prefs = getPreferences();
    if (!prefs.localFilesDir || !fs.existsSync(prefs.localFilesDir)) {
        error = "Please set a directory to load your songs from!";
        return;
    }

    await resetFileIndex(prefs.localFilesDir);
    updateSongCount();
    resetWatcher(prefs.localFilesDir);
}

function emitAllSongs() {
    let sdr: SongDirectoryResponse;

    if(error) sdr = {success: false, error};
    else sdr = {success: true, songs: getSortedSongs()}
    mainWindow?.webContents.send("songs:emit", sdr);
}

function getSortedSongs(): LocalSongEntry[] {
    return Array.from(index.values())
        .sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime())
        .map(e => ({...e.metadata, context: {type: "local", name: "Local Files", url: "/collection/local"}}))
}

async function setSongDirectory() {
    if (!mainWindow) return;
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"]
    });
    if (result.canceled) {
        return;
    }
    setPreferences({localFilesDir: result.filePaths[0]});
    await resetIndex();
    emitAllSongs();
}

/* ---------- UTILITY FUNCTIONS ---------- */

async function getThumbnail(id: string, pictureBuffer: Uint8Array): Promise<string> {
    const thumbDir = path.join(app.getPath("userData"), "thumbnails");
    const thumbPath = path.join(thumbDir, `${id}.png`);
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
        const pic = metadata.common.picture?.[0];
        if (!pic) return null;

        const buffer = await sharp(pic.data).png().toBuffer();
        return `data:image/png;base64,${buffer.toString("base64")}`;
    } catch (err) {
        console.error("Failed to extract full cover:", err);
        return null;
    }
}
