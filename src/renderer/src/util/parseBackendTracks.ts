import {RemoteSongEntry} from "../../../shared/TrackInfo.js";
import {PlaylistDTO, PlaylistSongDTO, ReleaseDTO} from "../../../shared/Api";

export function releaseToSongEntries(rel: ReleaseDTO | null): RemoteSongEntry[] {
    if (!rel) return [];

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
            context: {type: "release", name: rel.releaseName, url: "/release/" + rel.releaseId, id: rel.releaseId},
            type: "remote",
            sources: t.sources.map(src => ({
                id: src.sourceId,
                url: src.url,
                quality: src.quality
            }))
        };
    });
}

export function orderedIdsAndSongsToSongEntries(orderedIds: string[], songsMap: Record<string, PlaylistSongDTO>, playlist: Pick<PlaylistDTO, "playlistId" | "playlistName">): RemoteSongEntry[] {
    return orderedIds.map(id => songsMap[id])
        .filter(Boolean)
        .map(ps => playlistSongToRemoteSongEntry(ps, playlist));
}

export function playlistToSongEntries(playlist: PlaylistDTO): RemoteSongEntry[] {
    return playlist.playlistSongs.map(ps => playlistSongToRemoteSongEntry(ps, playlist));
}

const playlistSongToRemoteSongEntry = (ps: PlaylistSongDTO, playlist: Pick<PlaylistDTO, "playlistId" | "playlistName">): RemoteSongEntry => {
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
        context: {type: "playlist", url: "/playlist/" + playlist.playlistId, name: playlist.playlistName, id: playlist.playlistId},
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
}
