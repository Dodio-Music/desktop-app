import {BaseSongEntry} from "./TrackInfo.js";

export interface PlayerState {
    currentTrack: BaseSongEntry | null;
    userPaused: boolean;
    currentTime: number;
    duration: number;
    waitingForData: boolean;
    latency: number;
    playbackRunning: boolean;
}

export interface WaveformData {
    id: string;
    peaks: number[];
}

export type PlayerEvent =
    | { type: "media-transition", waveformData?: WaveformData, track: BaseSongEntry}
    | { type: "pending-data", data: Partial<PlayerState>}
    | ({ type: "waveform-data"} & WaveformData)
    | { type: "loading-progress"; progress: number[] };


export type SourceType = "remote" | "local";
