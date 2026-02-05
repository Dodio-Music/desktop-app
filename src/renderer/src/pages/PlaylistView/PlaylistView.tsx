import {useNavigate} from "react-router-dom";
import {useEffect, useRef, useState} from "react";
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
import { FaRegCircleUser } from "react-icons/fa6";
import {GoDotFill} from "react-icons/go";
import {MdOutlineEdit} from "react-icons/md";
import {LuUsers} from "react-icons/lu";
import PlaylistInitPopup from "@renderer/components/Popup/CreatePlaylist/PlaylistInitPopup";
import {useRequiredParam} from "@renderer/hooks/useRequiredParam";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {useDispatch, useSelector} from "react-redux";
import {setPlaylist} from "@renderer/redux/playlistSlice";
import {subscribeToPlaylist} from "@renderer/ws/stompClient";
import {RootState} from "@renderer/redux/store";

const PlaylistView = () => {
    const id = useRequiredParam("id");

    const scrollPageRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const [updateOpen, setUpdateOpen] = useState(false);
    const {data: playlist, loading, error, refetch} = useFetchData<PlaylistDTO>(`/playlist/${id}/songs`);
    const albumLengthSeconds = playlist?.playlistSongs.map(r => r.releaseTrack.track.duration).reduce((partialSum, a) => partialSum + a, 0) ?? 0;

    const info = useAuth().info;
    const playlistUser = (playlist?.playlistUsers.find(p => p.user.username === info.username));
    const canReorder = playlistUser?.role === "OWNER" || playlistUser?.role === "EDITOR";

    const dispatch = useDispatch();
    const orderedIds = useSelector((s: RootState) => s.playlistSlice.orderedIds);

    const songEntries = playlistTracksToSongEntries(playlist, orderedIds);

    useEffect(() => {
        if (!playlist) return;

        dispatch(setPlaylist({
            playlistId: playlist.playlistId,
            orderedIds: playlist.playlistSongs.map(v => v.playlistSongId)
        }));

        const sub = subscribeToPlaylist(playlist.playlistId);

        return () => sub?.unsubscribe();
    }, [dispatch, playlist]);

    return (
        <div
            className={`pageWrapper pageWrapperFullHeight ${classNames(s.pageWrapper)}`}
            ref={scrollPageRef}
        >
            {!playlist && loading && <LoadingPage />}

            {!loading && error && (
                <p className="errorPage">{error}</p>
            )}

            {playlist && (
                <>
                    <div className={s.headerWrapper}>
                        <div className={s.infoWrapper}>
                            <div className={s.cover}>
                                <CoverGrid coverArtUrls={playlist.coverArtUrls.length > 0 ? playlist.coverArtUrls : [dodo]}/>
                            </div>
                            <div className={s.releaseInfo}>
                                <p className={s.publicPrivate}>{playlist.isPublic ? "Public Playlist" : "Private Playlist"}</p>
                                <div>
                                    <p className={s.releaseTitle}>{playlist.playlistName}</p>
                                </div>
                                <div className={s.horiz}>
                                    <p className={s.owner}><FaRegCircleUser/><span className={s.link}>{playlist.owner.displayName}</span></p>
                                    <GoDotFill size={9} />
                                    <p className={s.tracksInfo}>{playlist.playlistSongs.length} song{playlist.playlistSongs.length !== 1 && "s"}, {formatDurationHuman(albumLengthSeconds)}</p>
                                </div>
                                <div className={s.optionBar}>
                                    <button><MdOutlineEdit style={{transform: "scale(1.1)"}} onClick={() => setUpdateOpen(true)}/></button>
                                    <button><LuUsers /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <SongList
                        scrollElement={scrollPageRef}
                        songs={songEntries}
                        slots={playlistSongRowSlots}
                        gridTemplateColumns="30px 4fr 2.5fr 1.5fr 1fr 105px"
                        contextHelpers={{view: "playlist", playlistId: playlist.playlistId, refetch}}
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
        </div>
    );
};

export default PlaylistView;
