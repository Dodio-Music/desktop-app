import {RemoteSongEntry, SongSource} from "../../../shared/TrackInfo.js";

export function parseBackendTracks(data: any[]): RemoteSongEntry[] {
    return data.map((releaseTrack): RemoteSongEntry => {

        return {
            id: releaseTrack.releaseTrackPK.trackId,
            title: releaseTrack.track.title ?? "Unknown Title",
            artists: releaseTrack.track.artists?.map((a: any) => a.artistName) ?? [],
            album: releaseTrack.release.releaseName ?? "Unknown Album",
            duration: releaseTrack.track.duration,
            picture: releaseTrack.release.coverArtUrl,
            type: "remote",
            sources: (releaseTrack.track.sources ?? []).map((src: any): SongSource => ({
                id: src.sourceId,
                url: src.url,
                quality: src.quality
            })),
        };
    });
}
