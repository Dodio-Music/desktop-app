export interface PlayerState {
    currentTrackUrl: string | null;
    userPaused: boolean;
    currentTime: number;
    duration: number;
    waitingForData: boolean;
    sourceType: SourceType;
    latency: number;
    playbackRunning: boolean;
}

export interface WaveformData {
    url: string;
    peaks: number[];
}

export type PlayerEvent =
    | { type: "media-transition"; url: string, waveformData?: WaveformData}
    | ({ type: "waveform-data"} & WaveformData)
    | { type: "loading-progress"; progress: number[] };


export type SourceType = "remote" | "local";
