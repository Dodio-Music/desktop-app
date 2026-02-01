import {useNavigate, useParams} from "react-router-dom";
import {useEffect, useRef} from "react";
import toast from "react-hot-toast";
import useFetchData from "@renderer/hooks/useFetchData";
import {PlaylistDTO} from "../../../../shared/Api";
import classNames from "classnames";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {formatTime} from "@renderer/util/timeUtils";
import {SongList} from "@renderer/components/SongList/SongList";
import {playlistSongRowSlots} from "@renderer/components/SongList/ColumnConfig";
import s from "./PlaylistView.module.css";
import dodo from "../../../../../resources/dodo_whiteondark_512.png";
import {playlistTracksToSongEntries} from "@renderer/util/parseBackendTracks";
import CoverGrid from "@renderer/components/CoverGrid/CoverGrid";

const PlaylistView = () => {
    const navigate = useNavigate();
    const {id} = useParams();
    const mounted = useRef(false);
    const scrollPageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id || mounted.current) return;
        toast.error("No ID provided for ReleasePage!");
        navigate(-1);
        mounted.current = true;
    }, [id]);

    const {data: playlist, loading, error, refetch} = useFetchData<PlaylistDTO>(`/playlist/${id}/songs`);

    const songEntries = playlistTracksToSongEntries(playlist);

    const albumLengthSeconds = playlist?.playlistSongs.map(r => r.releaseTrack.track.duration).reduce((partialSum, a) => partialSum + a, 0) ?? 0;

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
                                <div>
                                    <p className={s.releaseTitle}>{playlist.playlistName}</p>
                                    <p className={s.artists}>{<span className={s.link}>{playlist.playlistUsers.find(u => u.role === "OWNER")?.user.displayName}</span>}</p>
                                </div>
                                <p className={s.tracksInfo}>{playlist.playlistSongs.length} Track{playlist.playlistSongs.length !== 1 && "s"} ({formatTime(albumLengthSeconds)})</p>
                            </div>
                        </div>
                    </div>
                    <SongList
                        scrollElement={scrollPageRef}
                        songs={songEntries}
                        slots={playlistSongRowSlots}
                        gridTemplateColumns="30px 4fr 2.5fr 1.5fr 1fr 105px"
                        contextHelpers={{view: "playlist", playlistId: playlist.playlistId, refetch}}
                    />
                </>
            )}
        </div>
    );
};

export default PlaylistView;
