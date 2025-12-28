import {SourceType} from "./PlayerState.js";
import {SourceQuality} from "./Api.js";

export interface BaseSongEntry {
    id: string;
    title: string;
    artists: string[];
    album: string;
    duration: number;
    picture?: string;
    type: SourceType;
}

export interface LocalSongEntry extends BaseSongEntry {
    createdAt: string;
    fileName: string;
    fullPath: string;
}

export interface RemoteSongEntry extends BaseSongEntry {
    sources: SongSource[];
    waveformUrl: string | null;
    releaseDate: string;
    releaseId: string;
}

export interface SongSource {
    id: string;
    url: string;
    quality: SourceQuality;
}

export function isLocalSong(entry: BaseSongEntry): entry is LocalSongEntry {
    return entry.type === "local";
}

export function isRemoteSong(entry: BaseSongEntry): entry is RemoteSongEntry {
    return entry.type === "remote";
}

export type SongDirectoryResponse =
    | { success: true, songs: LocalSongEntry[]; }
    | { success: false, error: string };

export const SEGMENT_DURATION = 1;
