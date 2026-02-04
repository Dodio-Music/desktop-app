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
            releaseTrackId: rt.releaseTrackId,
            type: "remote",
            sources: t.sources.map(src => ({
                id: src.sourceId,
                url: src.url,
                quality: src.quality
            }))
        };
    });
}

// export function playlistTracksToSongEntries(playlist: PlaylistDTO | null): RemoteSongEntry[] {
//     if(!playlist) return [];
//
//     return playlist.playlistSongs.map(ps => {
//         const t = ps.releaseTrack.track;
//         const r = ps.releaseTrack.release;
//
//         return {
//             id: ps.playlistSongId,
//             title: t.title,
//             artists: t.artists,
//             album: r.releaseName,
//             duration: t.duration,
//             picture: r.coverArtUrl,
//             waveformUrl: t.waveformUrl,
//             releaseTrackId: ps.releaseTrack.releaseTrackId,
//             releaseId: r.releaseId,
//             releaseDate: r.releaseDate,
//             addedAt: ps.addedAt,
//             addedBy: ps.addedBy,
//             type: "remote",
//             sources: t.sources.map(src => ({
//                 id: src.sourceId,
//                 url: src.url,
//                 quality: src.quality
//             }))
//         };
//     });
// }

export function playlistTracksToSongEntries(
    playlist: PlaylistDTO | null,
    orderedIds?: string[]
): RemoteSongEntry[] {
    if (!playlist) return [];

    const songMap = new Map(
        playlist.playlistSongs.map(ps => [ps.playlistSongId, ps])
    );

    const ordered = orderedIds
        ? orderedIds.map(id => songMap.get(id)).filter(Boolean)
        : playlist.playlistSongs;

    return ordered.map(ps => {
        const t = ps!.releaseTrack.track;
        const r = ps!.releaseTrack.release;

        return {
            id: ps!.playlistSongId,
            title: t.title,
            artists: t.artists,
            album: r.releaseName,
            duration: t.duration,
            picture: r.coverArtUrl,
            waveformUrl: t.waveformUrl,
            releaseTrackId: ps!.releaseTrack.releaseTrackId,
            releaseId: r.releaseId,
            releaseDate: r.releaseDate,
            addedAt: ps!.addedAt,
            addedBy: ps!.addedBy,
            type: "remote",
            sources: t.sources.map(src => ({
                id: src.sourceId,
                url: src.url,
                quality: src.quality
            }))
        };
    });
}

