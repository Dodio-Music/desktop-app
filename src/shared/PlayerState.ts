import {BaseSongEntry} from "./TrackInfo.js";

export interface PlayerState {
    currentTrack: BaseSongEntry | null;
    id: string | null;
    url: string | null;
    userPaused: boolean;
    currentTime: number;
    duration: number;
    waitingForData: boolean;
    sourceType: SourceType;
    latency: number;
    playbackRunning: boolean;
}

export interface WaveformData {
    id: string;
    peaks: number[];
}

export type PlayerEvent =
    | { type: "media-transition"; id: string, waveformData?: WaveformData, track: BaseSongEntry}
    | ({ type: "waveform-data"} & WaveformData)
    | { type: "loading-progress"; progress: number[] };


export type SourceType = "remote" | "local";
