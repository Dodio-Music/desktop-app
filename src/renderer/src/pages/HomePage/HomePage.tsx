import s from "./HomePage.module.css";
import useFetchData from "@renderer/hooks/useFetchData";
import {PlaylistPreviewDTO, ReleaseDTO, ReleasePreviewDTO} from "../../../../shared/Api";
import {releaseToSongEntries} from "@renderer/util/parseBackendTracks";
import {useNavigate} from "react-router-dom";
import {MouseEvent, useCallback, useEffect, useRef, useState} from "react";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {isRemoteSong} from "../../../../shared/TrackInfo";
import toast from "react-hot-toast";
import {useAuth} from "@renderer/hooks/reduxHooks";
import Card from "@renderer/components/Card/Card";
import {useContextMenu} from "@renderer/hooks/useContextMenu";
import {renderEntityActions} from "@renderer/contextMenus/menuHelper";
import {useConfirm} from "@renderer/hooks/useConfirm";
import {ContextMenu} from "@renderer/contextMenus/ContextMenu";
import CardSkeleton from "@renderer/components/Card/CardSkeleton";
import dodo from "../../../../../resources/dodo_whiteondark_512.png";
import classNames from "classnames";
import ToggleSectionButton from "@renderer/pages/HomePage/ToggleSectionButton";

type Section = "releases" | "playlists";

const HomePage = () => {
    const navigate = useNavigate();
    const [expandSection, setexpandSection] = useState<Record<Section, boolean>>({playlists: false, releases: false});
    const {
        data: dataReleases,
        loading: loadingReleases,
        error: errorReleases,
        refetch: refetchReleases
    } = useFetchData<ReleasePreviewDTO[]>("/release");
    const {
        data: dataPlaylists,
        loading: loadingPlaylists,
        error: errorPlaylists,
        refetch: refetchPlaylists
    } = useFetchData<PlaylistPreviewDTO[]>("/playlist/public");
    const confirm = useConfirm();
    const ctx = useContextMenu();
    const track = useSelector((state: RootState) => state.nativePlayer.currentTrack);
    const userPaused = useSelector((state: RootState) => state.nativePlayer.userPaused);
    const authInfo = useAuth().info;

    const trackRef = useRef(track);
    const userPausedRef = useRef(userPaused);

    useEffect(() => {
        trackRef.current = track;
    }, [track]);

    useEffect(() => {
        userPausedRef.current = userPaused;
    }, [userPaused]);

    const handleIconClick = useCallback(
        async (e: MouseEvent, releasePrev: ReleasePreviewDTO) => {
            e.stopPropagation();

            const track = trackRef.current;

            if (track && isRemoteSong(track) && track.releaseId === releasePrev.releaseId) {
                window.api.pauseOrResume();
                return;
            }

            const req = await window.api.authRequest("get", `/release/${releasePrev.releaseId}`);
            if (req.type === "error") {
                toast.error("Couldn't load release!");
                return;
            }

            const releaseTracks = releaseToSongEntries(req.value as ReleaseDTO);
            window.api.loadTrackRemote(releaseTracks[0], releaseTracks);
        },
        []
    );

    const handleClick = useCallback(
        (release: ReleasePreviewDTO) => navigate(`/release/${release.releaseId}`),
        [navigate]
    );

    return (
        <div className={`pageWrapper ${s.wrapper}`}>
            <div className={s.heading}>
                <h1>New Releases</h1>
                <ToggleSectionButton
                    expanded={expandSection.releases}
                    onToggle={() => setexpandSection(prev => ({...prev, releases: !prev.releases}))}
                />
            </div>
            <div className={classNames(s.scroller, expandSection.releases && s.scrollerShow, errorReleases && s.scrollerError)}>
                {errorReleases && !dataReleases ?
                    <div className={s.error}>
                        <p>{`Error: ${errorReleases}`}</p>
                        <button onClick={refetchReleases}>Refresh</button>
                    </div>
                    :
                    (loadingReleases || !dataReleases)
                        ? Array.from({length: 12}).map((_, i) => (
                            <CardSkeleton key={i}/>
                        ))
                        :
                        dataReleases.map(t => {
                            const isPlaying = track && isRemoteSong(track) && track.releaseId === t.releaseId && !userPaused;

                            return <Card
                                data={t}
                                onIconClick={handleIconClick}
                                key={t.releaseName}
                                isPlaying={isPlaying}
                                onClick={handleClick}
                                onContextMenu={(e, data) => ctx.open(e, {type: "release", data})}
                                getTitle={(r) => r.releaseName}
                                getArtists={(r) => r.artists}
                                getCoverUrl={(r) => r.coverArtUrl}
                            />;
                        })
                }
            </div>
            <div className={s.heading}>
                <h1>Discover Playlists</h1>
                <ToggleSectionButton
                    expanded={expandSection.playlists}
                    onToggle={() => setexpandSection(prev => ({...prev, playlists: !prev.playlists}))}
                />
            </div>
            <div className={classNames(s.scroller, expandSection.playlists && s.scrollerShow, errorPlaylists && s.scrollerError)}>
                {errorPlaylists && !dataPlaylists ?
                    <div className={s.error}>
                        <p>{`Error: ${errorPlaylists}`}</p>
                        <button onClick={refetchPlaylists}>Refresh</button>
                    </div>
                    :
                    (loadingPlaylists || !dataPlaylists)
                    ? Array.from({length: 12}).map((_, i) => (
                        <CardSkeleton key={i}/>
                    ))
                    :
                    dataPlaylists.map(playlist =>
                        <Card key={playlist.playlistId}
                              data={playlist}
                              onClick={() => navigate(`/playlist/${playlist.playlistId}`)}
                              isPlaying={false}
                              onIconClick={() => {
                              }}
                              onContextMenu={(e, data) => ctx.open(e, {type: "playlist", data})}
                              getTitle={p => p.playlistName}
                              getArtists={c => [c.owner.displayName]}
                              getCoverUrl={() => dodo}
                              getTiledCovers={() => playlist.coverArtUrls.length > 0 ? playlist.coverArtUrls : undefined}
                        />
                    )
                }
            </div>
            <ContextMenu ctx={ctx}>
                {
                    ctx.state && renderEntityActions(ctx.state.target, ctx.close, {
                        confirm,
                        refetch: ctx.state.target.type === "release" ? refetchReleases : refetchPlaylists,
                        role: authInfo.role,
                        username: authInfo.username
                    })
                }
            </ContextMenu>
        </div>
    );
};

export default HomePage;
