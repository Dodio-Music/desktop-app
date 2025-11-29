import {RemoteSongEntry} from "../../../shared/TrackInfo.js";
import {ReleaseDTO} from "../../../shared/Api";

export function releaseToSongEntries(rel: ReleaseDTO): RemoteSongEntry[] {
    return rel.releaseTracks.map(rt => {
        const t = rt.track;

        return {
            id: t.trackId,
            title: t.title,
            artists: t.artists,
            album: rel.releaseName,
            duration: t.duration,
            picture: rel.coverArtUrl,
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
