import {useNavigate} from "react-router-dom";
import {useMemo, useRef, useState} from "react";
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
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {Tooltip} from "@mui/material";
import InvitePopup from "@renderer/components/Popup/Playlist/InvitePopup/InvitePopup";
import MembersPopup from "@renderer/components/Popup/Playlist/MembersPopup/MembersPopup";
import {BsThreeDots} from "react-icons/bs";
import {useContextMenu} from "@renderer/hooks/useContextMenu";
import {ContextMenu} from "@renderer/contextMenus/ContextMenu";
import {renderEntityActions} from "@renderer/contextMenus/menuHelper";
import {useConfirm} from "@renderer/hooks/useConfirm";
import {usePlaylistLifecycle} from "@renderer/hooks/playlist/usePlaylistLifecycle";
import {useNotifyPlaylistChange} from "@renderer/hooks/playlist/useNotifyPlaylistChange";

const PlaylistView = () => {
    const id = useRequiredParam("id");
    const {data: playlist, loading, error, refetch, playlistUser} = usePlaylistLifecycle(parseInt(id ?? ""));
    const scrollPageRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const ctx = useContextMenu();
    const confirm = useConfirm();
    const playlistUser = users.find(p => p.user.username === info.username);

    const [updateOpen, setUpdateOpen] = useState(false);
    const [addMembersOpen, setAddMembersOpen] = useState(false);
    const [membersOpen, setMembersOpen] = useState(false);

    const {orderedIds, songs, playlistName, isPublic, playlistId} = useSelector((state: RootState) => state.playlistSlice);

    const albumLengthSeconds = useMemo(() => {
        if (!orderedIds || !songs) return 0;
        return orderedIds
            .map(id => songs[id]?.releaseTrack.track.duration ?? 0)
            .reduce((sum, d) => sum + d, 0);
    }, [orderedIds, songs]);

    const permissions = useMemo(() => {
        const role = playlistUser?.role;
        return {
            role,
            canReorder: role === "OWNER" || role === "EDITOR",
            canEdit: role === "OWNER",
            canInvite: role === "OWNER",
        };
    }, [playlistUser]);
    useNotifyPlaylistChange(permissions.role);

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
                                <div className={s.optionBar}>
                                    <Tooltip title={"View Members"}>
                                        <button onClick={() => setMembersOpen(true)}><LuUsers/></button>
                                    </Tooltip>
                                    <Tooltip title={permissions.canInvite ? "Invite Users" : "You aren't allowed to invite users!"}>
                                        <button className={!permissions.canInvite ? s.disabled : ""} onClick={() => {
                                            if (!permissions.canInvite) return;
                                            setAddMembersOpen(true);
                                        }}><LuUserRoundPlus/></button>
                                    </Tooltip>
                                    <Tooltip
                                        title={permissions.canEdit ? "Edit Playlist" : "You aren't allowed to change the playlist!"}>
                                        <button className={!permissions.canEdit ? s.disabled : ""}
                                                onClick={() => {
                                                    if (!permissions.canEdit) return;
                                                    setUpdateOpen(true);
                                                }}
                                        >
                                            <MdOutlineEdit style={{transform: "scale(1.1)"}}/>
                                        </button>
                                    </Tooltip>
                                    <Tooltip
                                        title={"More options"}>
                                        <button onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                            ctx.open(e, {
                                                type: "playlist",
                                                data: playlist
                                            }, {clientX: rect.right - rect.width - 70, clientY: rect.bottom + 10});
                                        }}>
                                            <BsThreeDots/></button>
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
                        contextHelpers={{
                            view: "playlist",
                            playlistId: playlist.playlistId,
                            currentUserPlaylistRole: permissions.role ?? undefined
                        }}
                        helpers={{
                            navigate,
                            enableDrag: permissions.canReorder,
                            playlistId: playlist.playlistId,
                            refresh: refetch
                        }}
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
                                currentUserPlaylistRole: permissions.role ?? undefined,
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
