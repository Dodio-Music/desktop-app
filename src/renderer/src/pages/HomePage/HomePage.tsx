import s from "./HomePage.module.css";
import useFetchData from "@renderer/hooks/useFetchData";
import {PlaylistPreviewDTO, ReleasePreviewDTO} from "../../../../shared/Api";
import {useNavigate} from "react-router-dom";
import {useCallback} from "react";
import {useAppDispatch, useAppSelector} from "@renderer/redux/store";
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
    const expandedSection = useAppSelector(state => state.uiSlice.homepage.expandedSections);
    const dispatch = useAppDispatch();
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
    const track = useAppSelector(state => state.nativePlayer.currentTrack);
    const userPaused = useAppSelector(state => state.nativePlayer.userPaused);
    const authInfo = useAuth().info;
    const loadCollection = useLoadCollection();

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
                                onPlayClick={(e) => {
                                    e.stopPropagation();
                                    void loadCollection(t.releaseId, "release")}}
                                key={t.releaseName}
                                isPlaying={isPlaying}
                                onClick={() => handleClick(t)}
                                onContextMenu={(e) => ctx.open(e, {type: "release", data: t})}
                                title={t.releaseName}
                                entities={t.artists.map(a => ({id: a.artistId, name: a.artistName, navigateTo: "/artist/" + a.artistId}))}
                                coverUrl={t.coverArtUrl}
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
                                         onClick={() => navigate(`/playlist/${playlist.playlistId}`)}
                                         isPlaying={isPlaying}
                                         onPlayClick={(e => {
                                             e.stopPropagation();
                                             void loadCollection(playlist.playlistId, "playlist")})}
                                         onContextMenu={(e) => ctx.open(e, {
                                             type: "playlist",
                                             data: {...playlist, playlistUsers: [], playlistSongs: []}
                                         })}
                                         title={playlist.playlistName}
                                         entities={[{id: playlist.owner.username, name: playlist.owner.displayName}]}
                                         coverUrl={dodo}
                                         tiledCovers={playlist.coverArtUrls.length > 0 ? playlist.coverArtUrls : undefined}
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
