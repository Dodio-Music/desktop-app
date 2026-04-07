import s from "./SearchPage.module.css";
import useFetchData from "@renderer/hooks/useFetchData";
import {PlaylistPreviewDTO, ReleasePreviewDTO} from "../../../../shared/Api";
import {useNavigate} from "react-router-dom";
import {useCallback, useEffect} from "react";
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


    const {debouncedSearch} = useAppSelector(state => state.searchSlice);
    const releaseUrl = debouncedSearch.trim()
        ? `/search?query=${debouncedSearch}`
        : "/release";

    // const playlistUrl = debouncedSearch.trim()
    //     ? `/search?query=${debouncedSearch}&include=PLAYLIST`
    //     : "/playlist/public";

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



    useEffect(() => {
        console.log("Search debounce keys:", debouncedSearch);
        console.log(releaseUrl)
    }, [debouncedSearch]);

    return (
        <div className={`pageWrapper ${s.wrapper}`}>
            <div className={s.heading}>
                <h1>Releases</h1>
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
                                artistType={"artist"}
                                onClick={handleClick}
                                onContextMenu={(e, data) => ctx.open(e, {type: "release", data})}
                                getTitle={(r) => r.releaseName}
                                getArtists={(r) => (r.artists.map(a => ({id: a.artistId, name: a.artistName})))}
                                onArtistClick={(artist) => navigate(`/artist/${artist.id}`)}
                                getCoverUrl={(r) => r.coverArtUrl}
                            />;
                        })
                }
            </div>


            <div className={s.heading}>
                <h1>Artists</h1>
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
                                         getArtists={c => [{id: c.owner.username, name: c.owner.displayName}]}
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


            <div className={s.heading}>
                <h1>Songs</h1>
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
                                         getArtists={c => [{id: c.owner.username, name: c.owner.displayName}]}
                                         getCoverUrl={() => dodo}
                                         getTiledCovers={() => playlist.coverArtUrls.length > 0 ? playlist.coverArtUrls : undefined}
                            />;
                        })
                }
            </div>
        </div>
    );
};

export default HomePage;
