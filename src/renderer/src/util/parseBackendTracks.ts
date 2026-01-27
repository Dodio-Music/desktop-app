import {RemoteSongEntry} from "../../../shared/TrackInfo.js";
import {PlaylistDTO, ReleaseDTO} from "../../../shared/Api";

export function releaseToSongEntries(rel: ReleaseDTO | null): RemoteSongEntry[] {
    if(!rel) return [];

    return rel.releaseTracks.map(rt => {
        const t = rt.track;

        return {
            id: t.trackId,
            title: t.title,
            artists: t.artists,
            album: rel.releaseName,
            duration: t.duration,
            picture: rel.coverArtUrl,
            waveformUrl: t.waveformUrl,
            releaseId: rel.releaseId,
            releaseDate: rel.releaseDate,
            type: "remote",
            sources: t.sources.map(src => ({
                id: src.sourceId,
                url: src.url,
                quality: src.quality
            }))
        };
    });
}

export function playlistTracksToSongEntries(playlist: PlaylistDTO | null): RemoteSongEntry[] {
    if(!playlist) return [];

    console.log(playlist);
    return playlist.releaseTracks.map(rt => {
        const t = rt.track;
        const r = rt.release;

        return {
            id: t.trackId,
            title: t.title,
            artists: t.artists,
            album: r.releaseName,
            duration: t.duration,
            picture: r.coverArtUrl,
            waveformUrl: t.waveformUrl,
            releaseId: r.releaseId,
            releaseDate: r.releaseDate,
            type: "remote",
            sources: t.sources.map(src => ({
                id: src.sourceId,
                url: src.url,
                quality: src.quality
            }))
        };
    });
}
