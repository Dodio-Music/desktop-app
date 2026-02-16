import s from "./HomePage.module.css";
import useFetchData from "@renderer/hooks/useFetchData";
import {PlaylistPreviewDTO, ReleasePreviewDTO} from "../../../../shared/Api";
import {useNavigate} from "react-router-dom";
import {useCallback, useEffect, useRef} from "react";
import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "@renderer/redux/store";
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
import {homepageToggleExpandedSection} from "@renderer/redux/uiSlice";
import {useLoadCollection} from "@renderer/hooks/useLoadCollection";

const HomePage = () => {
    const navigate = useNavigate();
    const expandedSection = useSelector((state: RootState) => state.uiSlice.homepage.expandedSections);
    const dispatch = useDispatch<AppDispatch>();
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

    const userPausedRef = useRef(userPaused);
    const loadCollection = useLoadCollection();

    useEffect(() => {
        userPausedRef.current = userPaused;
    }, [userPaused]);

    const handleClick = useCallback(
        (release: ReleasePreviewDTO) => navigate(`/release/${release.releaseId}`),
        [navigate]
    );

    return (
        <div className={`pageWrapper ${s.wrapper}`}>
            <div className={s.heading}>
                <h1>New Releases</h1>
                <ToggleSectionButton
                    expanded={expandedSection.releases}
                    onToggle={() => dispatch(homepageToggleExpandedSection("releases"))}
                />
            </div>
            <div
                className={classNames(s.scroller, expandedSection.releases && s.scrollerShow, errorReleases && s.scrollerError)}>
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
                            const isPlaying = track?.context.type === "release" && track?.context.id === t.releaseId && !userPaused;

                            return <Card
                                data={t}
                                onIconClick={(e, data) => {
                                    e.stopPropagation();
                                    void loadCollection(data.releaseId, "release")}}
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
                    expanded={expandedSection.playlists}
                    onToggle={() => dispatch(homepageToggleExpandedSection("playlists"))}
                />
            </div>
            <div
                className={classNames(s.scroller, expandedSection.playlists && s.scrollerShow, errorPlaylists && s.scrollerError)}>
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
                        dataPlaylists.map(playlist => {
                            const isPlaying = track?.context.type === "playlist" && track?.context.id === playlist.playlistId && !userPaused;

                            return <Card key={playlist.playlistId}
                                         data={playlist}
                                         onClick={() => navigate(`/playlist/${playlist.playlistId}`)}
                                         isPlaying={isPlaying}
                                         onIconClick={(e, data) => {
                                             e.stopPropagation();
                                             void loadCollection(data.playlistId, "playlist")}}
                                         onContextMenu={(e, data) => ctx.open(e, {
                                             type: "playlist",
                                             data: {...data, playlistUsers: [], playlistSongs: []}
                                         })}
                                         getTitle={p => p.playlistName}
                                         getArtists={c => [c.owner.displayName]}
                                         getCoverUrl={() => dodo}
                                         getTiledCovers={() => playlist.coverArtUrls.length > 0 ? playlist.coverArtUrls : undefined}
                            />;
                        })
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
