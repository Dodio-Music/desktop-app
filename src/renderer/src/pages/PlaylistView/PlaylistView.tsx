import {useNavigate} from "react-router-dom";
import {useEffect, useMemo, useRef, useState} from "react";
import useFetchData from "@renderer/hooks/useFetchData";
import {PlaylistDTO} from "../../../../shared/Api";
import classNames from "classnames";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {formatDurationHuman} from "@renderer/util/timeUtils";
import {SongList} from "@renderer/components/SongList/SongList";
import {playlistSongRowSlots} from "@renderer/components/SongList/ColumnConfig";
import s from "./PlaylistView.module.css";
import dodo from "../../../../../resources/dodo_whiteondark_512.png";
import {playlistTracksToSongEntries} from "@renderer/util/parseBackendTracks";
import CoverGrid from "@renderer/components/CoverGrid/CoverGrid";
import {FaRegCircleUser} from "react-icons/fa6";
import {GoDotFill} from "react-icons/go";
import {MdOutlineEdit} from "react-icons/md";
import {LuUserRoundPlus, LuUsers} from "react-icons/lu";
import PlaylistInitPopup from "@renderer/components/Popup/Playlist/PlaylistInitPopup";
import {useRequiredParam} from "@renderer/hooks/useRequiredParam";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {useDispatch, useSelector} from "react-redux";
import {setPlaylist} from "@renderer/redux/playlistSlice";
import {subscribeToPlaylist} from "@renderer/ws/stompClient";
import {RootState} from "@renderer/redux/store";
import {Tooltip} from "@mui/material";
import InvitePopup from "@renderer/components/Popup/Playlist/InvitePopup/InvitePopup";
import MembersPopup from "@renderer/components/Popup/Playlist/MembersPopup/MembersPopup";

const PlaylistView = () => {
    const id = useRequiredParam("id");
    const scrollPageRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const [updateOpen, setUpdateOpen] = useState(false);
    const [addMembersOpen, setAddMembersOpen] = useState(false);
    const [membersOpen, setMembersOpen] = useState(false);
    const {data: playlist, loading, error, refetch} = useFetchData<PlaylistDTO>(`/playlist/${id}/songs`);

    const dispatch = useDispatch();
    const {orderedIds, songs} = useSelector((state: RootState) => state.playlistSlice);
    const info = useAuth().info;

    useEffect(() => {
        if (!playlist) return;

        const songsMap = Object.fromEntries(
            playlist.playlistSongs.map(ps => [ps.playlistSongId, ps])
        );

        dispatch(setPlaylist({
            playlistId: playlist.playlistId,
            orderedIds: playlist.playlistSongs.map(ps => ps.playlistSongId),
            songs: songsMap
        }));

        const sub = subscribeToPlaylist(playlist.playlistId);
        return () => sub?.unsubscribe();
    }, [dispatch, playlist]);

    const albumLengthSeconds = useMemo(() => {
        if (!orderedIds || !songs) return 0;
        return orderedIds
            .map(id => songs[id]?.releaseTrack.track.duration ?? 0)
            .reduce((sum, d) => sum + d, 0);
    }, [orderedIds, songs]);

    const playlistUser = (playlist?.playlistUsers.find(p => p.user.username === info.username));
    const canReorder = playlistUser?.role === "OWNER" || playlistUser?.role === "EDITOR";
    const canEdit = playlistUser?.role === "OWNER";
    const canInvite = playlistUser?.role === "OWNER";

    const songEntries = useMemo(() => {
        if (!orderedIds || !songs) return [];
        return playlistTracksToSongEntries(orderedIds, songs);
    }, [orderedIds, songs]);

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
                                <p className={s.publicPrivate}>{playlist.isPublic ? "Public Playlist" : "Private Playlist"}</p>
                                <div>
                                    <p className={s.releaseTitle}>{playlist.playlistName}</p>
                                </div>
                                <div className={s.horiz}>
                                    <p className={s.owner}><FaRegCircleUser/><span
                                        className={s.link}>{playlist.owner.displayName}</span></p>
                                    <GoDotFill size={9}/>
                                    <p className={s.tracksInfo}>{playlist.playlistSongs.length} song{playlist.playlistSongs.length !== 1 && "s"}, {formatDurationHuman(albumLengthSeconds)}</p>
                                </div>
                                <div className={s.optionBar}>
                                    <Tooltip title={"View Members"}>
                                        <button onClick={() => setMembersOpen(true)}><LuUsers/></button>
                                    </Tooltip>
                                    <Tooltip title={canInvite ? "Invite Users" : "You aren't allowed to invite users!"}>
                                        <button className={!canInvite ? s.disabled : ""} onClick={() => {
                                            if (!canInvite) return;
                                            setAddMembersOpen(true);
                                        }}><LuUserRoundPlus/></button>
                                    </Tooltip>
                                    <Tooltip
                                        title={canEdit ? "Edit Playlist" : "You aren't allowed to change the playlist!"}>
                                        <button className={!canEdit ? s.disabled : ""}><MdOutlineEdit
                                            style={{transform: "scale(1.1)"}}
                                            onClick={() => {
                                                if (!canEdit) return;
                                                setUpdateOpen(true);
                                            }}/></button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    </div>
                    <SongList
                        scrollElement={scrollPageRef}
                        songs={songEntries}
                        slots={playlistSongRowSlots}
                        gridTemplateColumns="30px 4fr 2.5fr 1.5fr 1fr 105px"
                        contextHelpers={{view: "playlist", playlistId: playlist.playlistId}}
                        helpers={{
                            navigate,
                            enableDrag: canReorder,
                            playlistId: playlist.playlistId,
                            refresh: refetch
                        }}
                    />
                </>
            )}

            <PlaylistInitPopup open={updateOpen} close={() => setUpdateOpen(false)} refetch={refetch}
                               title={"Update your Playlist"}
                               onSubmit={(data) => window.api.authRequest<string>("patch", "/playlist", data)}
                               playlistId={playlist?.playlistId}
                               initialName={playlist?.playlistName}
                               initialPublic={playlist?.isPublic}
                               submitLabel={"Update Playlist"}/>

            {playlist &&
                <>
                    <InvitePopup open={addMembersOpen} onClose={() => setAddMembersOpen(false)}
                                 playlistUserUsernames={playlist?.playlistUsers.map(u => u.user.username)}
                                 playlistId={playlist?.playlistId}
                    />

                    <MembersPopup open={membersOpen} onClose={() => setMembersOpen(false)} playlistUsers={playlist.playlistUsers}/>
                </>
            }
        </div>
    );
};

export default PlaylistView;
