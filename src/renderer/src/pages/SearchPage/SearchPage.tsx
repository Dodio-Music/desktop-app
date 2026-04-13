import s from "./SearchPage.module.css";
import useFetchData from "@renderer/hooks/useFetchData";
import {ArtistDTO, PlaylistPreviewDTO, ReleasePreviewDTO, SearchItemsDTO} from "../../../../shared/Api";
import {useNavigate} from "react-router-dom";
import {useCallback, useMemo, useRef, useState} from "react";
import {useAppSelector} from "@renderer/redux/store";
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
import {useLoadCollection} from "@renderer/hooks/useLoadCollection";
import NothingFound from "@renderer/components/NothingFound/NothingFound";
import {releaseTrackDTOListToSongEntries} from "@renderer/util/parseBackendTracks";
import {artistDiscographySongRowSots} from "@renderer/components/SongList/ColumnConfig";
import {SongList} from "@renderer/components/SongList/SongList";

type ExpandedSection = "RELEASES" | "ARTISTS" | "PLAYLISTS" | "TRACKS";
const SearchPage = () => {
    const scrollPageRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const {debouncedSearch} = useAppSelector(state => state.searchSlice);
    const searchUrl: string | null = debouncedSearch.trim()
        ? `/search?query=${debouncedSearch}`
        : null;

    const {
        data: dataSearch,
        loading: loadingSearch,
        error: errorSearch,
        refetch: refreshSearch
    } = useFetchData<SearchItemsDTO>(searchUrl)

    const confirm = useConfirm();
    const ctx = useContextMenu();
    const track = useAppSelector(state => state.nativePlayer.currentTrack);
    const userPaused = useAppSelector(state => state.nativePlayer.userPaused);
    const authInfo = useAuth().info;
    const loadCollection = useLoadCollection();

    const [expandedSections, setExpandedSections] = useState<Record<ExpandedSection, boolean>>({ARTISTS: false, PLAYLISTS: false, RELEASES: false, TRACKS: false});

    const handleReleaseClick = useCallback(
        (release: ReleasePreviewDTO) => navigate(`/release/${release.releaseId}`),
        [navigate]
    );

    const handleArtistClick = useCallback(
        (release: ArtistDTO) => navigate(`/artist/${release.artistId}`),
        [navigate]
    );

    const handlePlaylistClick = useCallback(
        (playlist: PlaylistPreviewDTO) => navigate(`/playlist/${playlist.playlistId}`),
        [navigate]
    );

    const releaseTrackResults = dataSearch?.releaseTrackResults;
    const trackEntries = useMemo(() => {
        if (!releaseTrackResults) return [];

        return releaseTrackDTOListToSongEntries(
            releaseTrackResults,
            {
                type: "search_results",
                name: "Search Results"
            }
        );
    }, [releaseTrackResults]);

    if (!debouncedSearch.trim()) {
        return <div className={`pageWrapper ${s.wrapper}`}>
            <NothingFound text={"Start typing to search"}></NothingFound>
        </div>;
    }

    if (dataSearch?.artistResults.length === 0 && dataSearch.releaseResults.length === 0 && dataSearch.releaseTrackResults.length === 0 && dataSearch.publicPlaylistResults.length === 0) {
        return <div className={`pageWrapper ${s.wrapper}`}>
            <NothingFound text={"No results found"} ></NothingFound>
        </div>;
    }

    return (
        <div className={`pageWrapper ${s.wrapper}`} ref={scrollPageRef}>
            {
                ((dataSearch?.releaseResults.length ?? 0) > 0 || loadingSearch) &&
                <>
                    <div className={s.heading}>
                        <h1>Releases</h1>
                        <ToggleSectionButton
                            expanded={expandedSections["RELEASES"]}
                            onToggle={() => setExpandedSections(prev => ({...prev, "RELEASES": !prev["RELEASES"]}))}
                        />
                    </div>
                    <div
                        className={classNames(s.scroller, expandedSections["RELEASES"] && s.scrollerShow, errorSearch && s.scrollerError)}>
                        {errorSearch && !dataSearch ?
                            <div className={s.error}>
                                <p>{`Error: ${errorSearch}`}</p>
                                <button onClick={refreshSearch}>Refresh</button>
                            </div>
                            :
                            (loadingSearch || !dataSearch)
                                ? Array.from({length: 12}).map((_, i) => (
                                    <CardSkeleton key={i}/>
                                ))
                                :
                                dataSearch.releaseResults.map(r => {
                                    const isPlaying = track?.context.type === "release" && track?.context.id === r.releaseId && !userPaused;

                                    return <Card
                                        onPlayClick={(e) => {
                                            e.stopPropagation();
                                            void loadCollection(r.releaseId, "release")}}
                                        key={r.releaseId}
                                        isPlaying={isPlaying}
                                        onClick={() => handleReleaseClick(r)}
                                        onContextMenu={(e) => ctx.open(e, {type: "release", data: r})}
                                        title={r.releaseName}
                                        entities={r.artists.map(a => ({id: a.artistId, name: a.artistName, navigateTo: "/artist/" + a.artistId}))}
                                        coverUrl={r.coverArtUrl}
                                    />;
                                })
                        }
                    </div>
                </>
            }

            {
                ((dataSearch?.artistResults.length ?? 0) > 0 || loadingSearch) &&
                <>
                    <div className={s.heading}>
                        <h1>Artists</h1>
                        <ToggleSectionButton
                            expanded={expandedSections["ARTISTS"]}
                            onToggle={() => setExpandedSections(prev => ({...prev, "ARTISTS": !prev["ARTISTS"]}))}
                        />
                    </div>
                    <div
                        className={classNames(s.scroller, expandedSections["ARTISTS"] && s.scrollerShow, errorSearch && s.scrollerError)}>
                        {errorSearch && !dataSearch ?
                            <div className={s.error}>
                                <p>{`Error: ${errorSearch}`}</p>
                                <button onClick={refreshSearch}>Refresh</button>
                            </div>
                            :
                            (loadingSearch || !dataSearch)
                                ? Array.from({length: 12}).map((_, i) => (
                                    <CardSkeleton key={i}/>
                                ))
                                :
                                dataSearch.artistResults.map(a => {
                                    return <Card
                                        key={a.artistId}
                                        onClick={() => handleArtistClick(a)}
                                        title={a.artistName}
                                        coverUrl={a.avatarUrl ?? dodo}
                                        entities={[{id: a.artistId, name: "Artist"}]}
                                    />;
                                })
                        }
                    </div>
                </>
            }

            {
                ((dataSearch?.publicPlaylistResults.length ?? 0) > 0 || loadingSearch) &&
                <>
                    <div className={s.heading}>
                        <h1>Playlists</h1>
                        <ToggleSectionButton
                            expanded={expandedSections["PLAYLISTS"]}
                            onToggle={() => setExpandedSections(prev => ({...prev, "PLAYLISTS": !prev["PLAYLISTS"]}))}
                        />
                    </div>
                    <div
                        className={classNames(s.scroller, expandedSections["PLAYLISTS"] && s.scrollerShow, errorSearch && s.scrollerError)}>
                        {errorSearch && !dataSearch ?
                            <div className={s.error}>
                                <p>{`Error: ${errorSearch}`}</p>
                                <button onClick={refreshSearch}>Refresh</button>
                            </div>
                            :
                            (loadingSearch || !dataSearch)
                                ? Array.from({length: 12}).map((_, i) => (
                                    <CardSkeleton key={i}/>
                                ))
                                :
                                dataSearch.publicPlaylistResults.map(p => {
                                    return <Card
                                        key={p.playlistId}
                                        onClick={() => handlePlaylistClick(p)}
                                        title={p.playlistName}
                                        coverUrl={dodo}
                                        tiledCovers={p.coverArtUrls ?? [dodo]}
                                        entities={[{id: p.owner.username, name: p.owner.displayName}]}
                                    />;
                                })
                        }
                    </div>
                </>
            }

            {
                ((dataSearch?.releaseTrackResults.length ?? 0) > 0 || loadingSearch) &&
                <>
                    <div className={s.heading}>
                        <h1>Tracks</h1>
                    </div>
                    <SongList songs={trackEntries}
                              slots={artistDiscographySongRowSots}
                              scrollElement={scrollPageRef}
                              gridTemplateColumns="30px 3.5fr 2.5fr 6ch 1.5fr 140px"
                              navigate={navigate}/>
                </>
            }

            <ContextMenu ctx={ctx}>
                {
                    ctx.state && renderEntityActions(ctx.state.target, ctx.close, {
                        confirm,
                        refetch: refreshSearch,
                        role: authInfo.role,
                        username: authInfo.username
                    })
                }
            </ContextMenu>
        </div>
    );
};

export default SearchPage;
