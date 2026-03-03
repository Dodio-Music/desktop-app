import {useCallback, useEffect, useRef} from "react";
import {PlaylistDTO, ReleaseDTO} from "../../../shared/Api";
import toast from "react-hot-toast";
import {RemoteSongEntry} from "../../../shared/TrackInfo";
import {playlistToSongEntries, releaseToSongEntries} from "@renderer/util/parseBackendTracks";
import {useAppSelector} from "@renderer/redux/store";

export const useLoadCollection = () => {
    const track = useAppSelector(state => state.nativePlayer.currentTrack);
    const trackRef = useRef(track);

    useEffect(() => {
        trackRef.current = track;
    }, [track]);

    return useCallback(
        async(collectionId: string | number, type: "playlist" | "release") => {
            const context = trackRef.current?.context;
            if (context?.type === type && context?.id === collectionId) {
                window.api.pauseOrResume();
                return;
            }

            const url = type === "playlist"
                ? `/playlist/${collectionId}/full`
                : `/release/${collectionId}`;

            const req = await window.api.authRequest<PlaylistDTO | ReleaseDTO>("get", url);
            if (req.type === "error") {
                toast.error("Couldn't load collection!");
                return;
            }

            let songs: RemoteSongEntry[];
            if (type === "release") songs = releaseToSongEntries(req.value as ReleaseDTO);
            else songs = playlistToSongEntries(req.value as PlaylistDTO);

            if (!songs.length) return;
            window.api.loadTrackRemote(songs[0], songs);
        }, []
    );
}
