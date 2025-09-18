import {ipcMain} from "electron";
import path from "path";
import fs from "fs/promises";
import {parseFile} from "music-metadata";

export interface SongEntry {
    name: string;
    fullPath: string;
    title: string;
    artists: string[];
    album: string;
    track?: number;
    duration?: number;
    picture?: string;
}

export const registerSongIndexer = () => {
    ipcMain.handle("songs:list", async (_, folderPath: string) => {
        return await simpleScan(folderPath);
    });
};

async function simpleScan(folderPath: string): Promise<SongEntry[]> {
    const files = await fs.readdir(folderPath, {withFileTypes: true});
    const supportedExts = [".mp3", ".flac", ".wav", ".ogg"];

    const tracks: SongEntry[] = [];

    for(const f of files) {
        if(!f.isFile() ||!supportedExts.includes(path.extname(f.name).toLowerCase())) {
            continue;
        }

        const fullPath = path.join(folderPath, f.name);
        try {
            const metadata = await parseFile(fullPath);
            const common = metadata.common;

            let pictureBase64: string | undefined;
            if(common.picture && common.picture.length > 0) {
                const pic = common.picture[0];
                pictureBase64 = `data:${pic.format};base64,${Buffer.from(pic.data).toString("base64")}`;
            }

            tracks.push({
                name: f.name,
                fullPath,
                title: common.title || f.name,
                artists: common.artists || ["Unknown Artist"],
                album: common.album || "Unknown Album",
                track: common.track.no || undefined,
                duration: metadata.format.duration || undefined,
                picture: pictureBase64
            })
        } catch(err) {
            console.error(`Failed to read metadata for ${fullPath}: `, err);
        }
    }

    return tracks;
}
