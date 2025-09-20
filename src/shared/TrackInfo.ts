export interface TrackInfo {
    id: string;
    title: string;
    album: string;
    artist: string;
    cover: string;
    manifest: TrackManifest;
    duration: number;
}

export interface TrackManifest {
    bitDepth: number;
    sampleRate: number;
    channels: number;
    url: string;
}
