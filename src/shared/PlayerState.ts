import {BaseSongEntry} from "./TrackInfo.js";

export interface PlayerState {
    currentTrack: BaseSongEntry | null;
    userPaused: boolean;
    currentTime: number;
    duration: number;
    waitingForData: boolean;
    latency: number;
    playbackRunning: boolean;
    repeatMode: RepeatMode | null;
}

export interface WaveformData {
    id: string;
    peaks: number[];
}

export enum RepeatMode {
    Off = "off",
    All = "all",
    One = "one"
}

export type PlayerEvent =
    | { type: "media-transition", waveformData?: WaveformData, track: BaseSongEntry}
    | { type: "pending-data", data: Partial<PlayerState>}
    | ({ type: "waveform-data"} & WaveformData)
    | { type: "loading-progress"; progress: number[] }
    | {type: "repeat-mode", repeatMode: RepeatMode}


export type SourceType = "remote" | "local";
