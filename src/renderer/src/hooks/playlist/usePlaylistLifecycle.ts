import {useDispatch, useSelector} from "react-redux";
import {PlaylistDTO} from "../../../../shared/Api";
import useFetchData from "@renderer/hooks/useFetchData";
import {useEffect, useRef} from "react";
import {resetPlaylist, setPlaylist, setPlaylistUser} from "@renderer/redux/playlistSlice";
import {
    resubscribeToPlaylist,
    subscribeToPlaylistDetails,
    subscribeToPlaylistMeta,
    subscribeToPlaylistSongs
} from "@renderer/stomp/stompClient";
import {AppDispatch, RootState} from "@renderer/redux/store";
import {useAuth} from "@renderer/hooks/reduxHooks";

export function usePlaylistLifecycle(playlistId: number) {
    const dispatch = useDispatch<AppDispatch>();
    const { data, loading, error, refetch } = useFetchData<PlaylistDTO>(`/playlist/${playlistId}/full`);
    const prevIsPublicRef = useRef<boolean | null>(null);
    const {isPublic, users} = useSelector((state: RootState) => state.playlistSlice);
    const info = useAuth().info;

    useEffect(() => {
        if (
            prevIsPublicRef.current !== null &&
            prevIsPublicRef.current !== isPublic &&
            isPublic !== null
        ) {
            resubscribeToPlaylist(playlistId, isPublic);
        }

        prevIsPublicRef.current = isPublic;
    }, [playlistId, isPublic]);

    useEffect(() => {
        if(!playlistUser) return;
        dispatch(setPlaylistUser(playlistUser));
    }, [dispatch, playlistUser]);

    useEffect(() => {
        if (!data) return;

        const songsMap = Object.fromEntries(
            data.playlistSongs.map(ps => [ps.playlistSongId, ps])
        );

        dispatch(setPlaylist({
            playlistId: data.playlistId,
            orderedIds: data.playlistSongs.map(ps => ps.playlistSongId),
            songs: songsMap,
            users: data.playlistUsers,
            playlistName: data.playlistName,
            isPublic: data.isPublic,
            kicked: false
        }));

        const unsubMeta = subscribeToPlaylistMeta(data.playlistId);
        const unsubSongs = subscribeToPlaylistSongs(data.playlistId, data.isPublic);
        const unsubDetails = subscribeToPlaylistDetails(data.playlistId, data.isPublic);

        return () => {
            unsubMeta?.();
            unsubSongs?.();
            unsubDetails?.();
        };
    }, [data, dispatch]);

    useEffect(() => {
        return () => {
            dispatch(resetPlaylist());
        };
    }, []);

    return { data, loading, error, refetch, playlistUser };
}
