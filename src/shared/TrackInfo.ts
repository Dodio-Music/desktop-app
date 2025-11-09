import {SourceType} from "./PlayerState.js";

export interface BaseSongEntry {
    id: string;
    title: string;
    artists: string[];
    album: string;
    duration?: number;
    picture?: string;
    type: SourceType;
}

export interface LocalSongEntry extends BaseSongEntry {
    createdAt: Date | string;
    fileName: string;
    fullPath: string;
}

export interface RemoteSongEntry extends BaseSongEntry {
    sources: SongSource[];
}

export interface SongSource {
    id: string;
    url: string;
}

export function isLocalSong(entry: BaseSongEntry): entry is LocalSongEntry {
    return entry.type === "local";
}

export function isRemoteSong(entry: BaseSongEntry): entry is RemoteSongEntry {
    return entry.type === "remote";
}

export const SEGMENT_DURATION = 1;
