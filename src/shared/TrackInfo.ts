import {SourceType} from "./PlayerState.js";
import {SourceQuality, UserPublicDTO} from "./Api.js";

export interface BaseSongEntry {
    id: string;
    title: string;
    artists: string[];
    album: string;
    duration: number;
    picture?: string;
    type: SourceType;
    context: PlaybackContext;
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
    releaseTrackId: string;

    addedAt?: Date;
    addedBy?: UserPublicDTO;
}

export type PlaybackContext =
    | { type: "local", name: string, url: string }
    | { type: "release", name: string, url: string, id: string }
    | { type: "playlist", name: string, url: string, id: number };

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
