import {useNavigate} from "react-router-dom";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import useFetchData from "@renderer/hooks/useFetchData";
import {PlaylistDTO} from "../../../../shared/Api";
import classNames from "classnames";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {formatDurationHuman} from "@renderer/util/timeUtils";
import {SongList} from "@renderer/components/SongList/SongList";
import {playlistSongRowSlots} from "@renderer/components/SongList/ColumnConfig";
import s from "./PlaylistView.module.css";
import so from "../../components/OptionBar/OptionBar.module.css";
import dodo from "../../../../../resources/dodo_whiteondark_512.png";
import {orderedIdsAndSongsToSongEntries} from "@renderer/util/parseBackendTracks";
import CoverGrid from "@renderer/components/CoverGrid/CoverGrid";
import {FaRegCircleUser} from "react-icons/fa6";
import {GoDotFill} from "react-icons/go";
import {MdOutlineAddCircleOutline, MdOutlineEdit} from "react-icons/md";
import {LuUserRoundPlus, LuUsers} from "react-icons/lu";
import PlaylistInitPopup from "@renderer/components/Popup/Playlist/PlaylistInitPopup";
import {useRequiredParam} from "@renderer/hooks/useRequiredParam";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {resetPlaylist, setPlaylist, setPlaylistUser} from "@renderer/redux/playlistSlice";
import {
    resubscribeToPlaylist,
    subscribeToPlaylistDetails,
    subscribeToPlaylistMeta,
    subscribeToPlaylistSongs
} from "@renderer/stomp/stompClient";
import InvitePopup from "@renderer/components/Popup/Playlist/InvitePopup/InvitePopup";
import MembersPopup from "@renderer/components/Popup/Playlist/MembersPopup/MembersPopup";
import {BsThreeDots} from "react-icons/bs";
import {useContextMenu} from "@renderer/hooks/useContextMenu";
import {ContextMenu} from "@renderer/contextMenus/ContextMenu";
import {renderEntityActions} from "@renderer/contextMenus/menuHelper";
import {useConfirm} from "@renderer/hooks/useConfirm";
import {toCapitalized} from "@renderer/util/playlistUtils";
import toast from "react-hot-toast";
import {useAppDispatch, useAppSelector} from "@renderer/redux/store";
import {OptionButton} from "@renderer/components/OptionBar/OptionButton";
import {IoIosCheckmarkCircle} from "react-icons/io";
import {likePlaylist, unlikePlaylist} from "@renderer/redux/likeSlice";
import {errorToString} from "@renderer/util/errorToString";

const PlaylistView = () => {
    const id = useRequiredParam("id");
    const scrollPageRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const ctx = useContextMenu();
    const confirm = useConfirm();

    const [updateOpen, setUpdateOpen] = useState(false);
    const [addMembersOpen, setAddMembersOpen] = useState(false);
    const [membersOpen, setMembersOpen] = useState(false);
    const {data: playlist, loading, error, refetch} = useFetchData<PlaylistDTO>(`/playlist/${id}/full`);

    const dispatch = useAppDispatch();
    const {orderedIds, songs, users, kicked, playlistName, isPublic, playlistId} = useAppSelector(state => state.playlistSlice);
    const info = useAuth().info;

    const prevRoleRef = useRef<typeof userRole | null>(null);
    const prevIsPublicRef = useRef<boolean | null>(null);

    useEffect(() => {
        if (prevIsPublicRef.current !== null && prevIsPublicRef.current !== isPublic && playlistId !== null && isPublic !== null) {
            resubscribeToPlaylist(playlistId, isPublic);
        }
        prevIsPublicRef.current = isPublic;
    }, [isPublic, playlistId]);

    useEffect(() => {
        if (!playlist) return;

        const songsMap = Object.fromEntries(
            playlist.playlistSongs.map(ps => [ps.playlistSongId, ps])
        );

        dispatch(setPlaylist({
            playlistId: playlist.playlistId,
            orderedIds: playlist.playlistSongs.map(ps => ps.playlistSongId),
            songs: songsMap,
            users: playlist.playlistUsers,
            playlistName: playlist.playlistName,
            isPublic: playlist.isPublic,
            kicked: false
        }));

        const unsubMeta = subscribeToPlaylistMeta(playlist.playlistId);
        const unsubSongs = subscribeToPlaylistSongs(playlist.playlistId, playlist.isPublic);
        const unsubDetails = subscribeToPlaylistDetails(playlist.playlistId, playlist.isPublic);
        return () => {
            unsubMeta?.();
            unsubSongs?.();
            unsubDetails?.();
        }
    }, [dispatch, playlist]);

    const albumLengthSeconds = useMemo(() => {
        if (!orderedIds || !songs) return 0;
        return orderedIds
            .map(id => songs[id]?.releaseTrack.track.duration ?? 0)
            .reduce((sum, d) => sum + d, 0);
    }, [orderedIds, songs]);

    const playlistUser = users.find(p => p.user.username === info.username);
    useEffect(() => {
        if(!playlistUser) return;
        dispatch(setPlaylistUser(playlistUser));
    }, [dispatch, playlistUser]);

    useEffect(() => {
        return () => {
            dispatch(resetPlaylist());
        }
    }, []);

    const userRole = playlistUser?.role;
    const canReorder = userRole === "OWNER" || userRole === "EDITOR";
    const canEdit = userRole === "OWNER";
    const canInvite = userRole === "OWNER";

    const songEntries = useMemo(() => {
        if (!orderedIds || !songs || !playlist) return [];
        return orderedIdsAndSongsToSongEntries(orderedIds, songs, playlist);
    }, [orderedIds, songs, playlist]);

    useEffect(() => {
        if (!userRole) return;

        const prevRole = prevRoleRef.current;
        if (prevRole && prevRole !== userRole) {
            toast.success(
                `The playlist owner changed your role to ${toCapitalized(userRole)}.`
            );
        }

        prevRoleRef.current = userRole;
    }, [userRole]);

    useEffect(() => {
        if (!kicked) return;

        toast.error("You were removed from this playlist.");
        navigate("/collection/playlists", { replace: true });
    }, [kicked, navigate]);

    const isLiked = useAppSelector(
        state => !!state.likeSlice.likedPlaylists[playlist?.playlistId ?? ""]
    );

    const handleLikeRelease = useCallback(async () => {
        if(!playlist?.playlistId) return;

        const res = await window.api.authRequest<string>("put", "/like", {likeScope: "PLAYLIST", likedId: playlist.playlistId, liked: !isLiked});

        if(res.type !== "error") {
            if(!isLiked) {
                dispatch(likePlaylist(playlist.playlistId));
                toast.success("Saved Playlist.");
            } else {
                dispatch(unlikePlaylist(playlist.playlistId));
                toast.success("Removed from Saved Playlists.");
            }
        } else {
            toast.error(errorToString(res.error));
        }
    }, [playlist, isLiked, dispatch]);

    return (
        <div
            className={`pageWrapper pageWrapperFullHeight ${classNames(s.pageWrapper)}`}
            ref={scrollPageRef}
        >
            {!playlist && loading && <LoadingPage/>}

            {!loading && error && (
                <p className="errorPage">{error}</p>
            )}

            {playlist && (
                <>
                    <div className={s.headerWrapper}>
                        <div className={s.infoWrapper}>
                            <div className={s.cover}>
                                <CoverGrid
                                    coverArtUrls={playlist.coverArtUrls.length > 0 ? playlist.coverArtUrls : [dodo]}/>
                            </div>
                            <div className={s.releaseInfo}>
                                <p className={s.publicPrivate}>{isPublic ? "Public Playlist" : "Private Playlist"}</p>
                                <div>
                                    <p className={s.releaseTitle}>{playlistName}</p>
                                </div>
                                <div className={s.horiz}>
                                    <p className={s.owner}><FaRegCircleUser/><span
                                        className={s.link}>{playlist.owner.displayName}</span></p>
                                    <GoDotFill size={9}/>
                                    <p className={s.tracksInfo}>{orderedIds.length} song{orderedIds.length !== 1 && "s"}, {formatDurationHuman(albumLengthSeconds)}</p>
                                </div>
                                <div className={so.optionBar}>
                                    <OptionButton tooltip={isLiked ? "Remove from Saved Playlists" : "Save Playlist"} onClick={() => handleLikeRelease()}>
                                        {isLiked ?
                                            <IoIosCheckmarkCircle style={{transform: "scale(1.1)", color: "var(--color-text-primary)"}} />
                                            :
                                            <MdOutlineAddCircleOutline style={{transform: "scale(1.1)"}} />
                                        }
                                    </OptionButton>
                                    <OptionButton
                                        tooltip="View Members"
                                        onClick={() => setMembersOpen(true)}
                                    >
                                        <LuUsers />
                                    </OptionButton>
                                    <OptionButton
                                        tooltip="Invite Users"
                                        disabledTooltip="You aren't allowed to invite users!"
                                        disabled={!canInvite}
                                        onClick={() => setAddMembersOpen(true)}
                                    >
                                        <LuUserRoundPlus />
                                    </OptionButton>
                                    <OptionButton
                                        tooltip="Edit Playlist"
                                        disabledTooltip="You aren't allowed to change the playlist!"
                                        disabled={!canEdit}
                                        onClick={() => setUpdateOpen(true)}
                                    >
                                        <MdOutlineEdit style={{ transform: "scale(1.1)" }} />
                                    </OptionButton>
                                    <OptionButton
                                        tooltip="More options"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

                                            ctx.open(
                                                e,
                                                { type: "playlist", data: playlist },
                                                { clientX: rect.right - rect.width - 70, clientY: rect.bottom + 10 }
                                            );
                                        }}
                                    >
                                        <BsThreeDots />
                                    </OptionButton>
                                </div>
                            </div>
                        </div>
                    </div>
                    <SongList
                        scrollElement={scrollPageRef}
                        songs={songEntries}
                        slots={playlistSongRowSlots}
                        gridTemplateColumns="30px 4fr 2.5fr 1.5fr 1fr 140px"
                        contextHelpers={{
                            view: "playlist",
                            playlistId: playlist.playlistId,
                            currentUserPlaylistRole: userRole ?? undefined
                        }}
                        helpers={{
                            navigate,
                            enableDrag: canReorder,
                            playlistId: playlist.playlistId,
                            refresh: refetch
                        }}
                        navigate={navigate}
                    />

                    <PlaylistInitPopup open={updateOpen} close={() => setUpdateOpen(false)}
                                       title={"Update your Playlist"}
                                       onSubmit={(data) => window.api.authRequest<string>("patch", "/playlist", data)}
                                       playlistId={playlistId ?? undefined}
                                       initialName={playlistName ?? undefined}
                                       initialPublic={isPublic ?? undefined}
                                       submitLabel={"Update Playlist"}/>

                    <InvitePopup open={addMembersOpen} onClose={() => setAddMembersOpen(false)}
                                 playlistId={playlist?.playlistId}
                    />

                    <MembersPopup open={membersOpen} onClose={() => setMembersOpen(false)}
                                  playlistId={playlist.playlistId}
                                  currentUser={playlistUser}
                    />

                    <ContextMenu ctx={ctx}>
                        {
                            ctx.state && renderEntityActions(ctx.state.target, ctx.close, {
                                playlistId: playlist.playlistId,
                                navigate: (path, replace) => navigate(path, {replace}),
                                currentUserPlaylistRole: userRole ?? undefined,
                                confirm
                            })
                        }
                    </ContextMenu>
                </>
            )}
        </div>
    );
};

export default PlaylistView;
