export interface PlayerState {
    currentTrack: string | null;
    userPaused: boolean;
    currentTime: number;
    duration: number;
    waitingForData: boolean;
    sourceType: SourceType;
    latency: number;
    trackChangeToken: number;
}

export type SourceType = "remote" | "local";
