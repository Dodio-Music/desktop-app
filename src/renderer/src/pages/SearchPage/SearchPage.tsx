import s from "./SearchPage.module.css";
import useFetchData from "@renderer/hooks/useFetchData";
import {ReleasePreviewDTO, SearchItemsDTO} from "../../../../shared/Api";
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



const SearchPage = () => {
    const navigate = useNavigate();
    const expandedSection = useAppSelector(state => state.uiSlice.homepage.expandedSections);
    const dispatch = useAppDispatch();


    const {debouncedSearch} = useAppSelector(state => state.searchSlice);
    const searchUrl :string|null = debouncedSearch.trim()
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

    const handleClick = useCallback(
        (release: ReleasePreviewDTO) => navigate(`/release/${release.releaseId}`),
        [navigate]
    );



    useEffect(() => {
        console.log("Search debounce keys:", debouncedSearch);
        console.log(searchUrl)
    }, [debouncedSearch]);

    if (!debouncedSearch.trim()) {
        return <div className={`pageWrapper ${s.wrapper}`}>Start typing to search</div>;
    }

    if (loadingSearch || !dataSearch) {
        return (
            <div className={`pageWrapper ${s.wrapper}`}>
                {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
        );
    }

    if (dataSearch.artistResults.length === 0 && dataSearch.releaseResults.length === 0 && dataSearch.trackResults.length === 0) {
        return <div className={`pageWrapper ${s.wrapper}`}>No results found</div>;
    }

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
                className={classNames(s.scroller, expandedSection.releases && s.scrollerShow, errorSearch && s.scrollerError)}>
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
                            const isPlaying =
                                track?.context.type === "release" &&
                                track?.context.id === r.id &&
                                !userPaused;

                            return (
                                <Card
                                    key={r.id}
                                    data={r}
                                    isPlaying={isPlaying}
                                    onClick={() => navigate(`/release/${r.id}`)}
                                    onContextMenu={() => {}}
                                    onIconClick={() => {}}
                                    getTitle={(r) => r.name}
                                    getArtists={(r) =>
                                        r.artistNames.map((name, i) => ({
                                            id: i.toString(),
                                            name
                                        }))
                                    }
                                    getCoverUrl={() => dodo}
                                />
                            );
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
                className={classNames(s.scroller, expandedSection.playlists && s.scrollerShow, errorSearch && s.scrollerError)}>
                {errorSearch && !dataSearch.artistResults ?
                    <div className={s.error}>
                        <p>{`Error: ${errorSearch}`}</p>
                        <button onClick={refreshSearch}>Refresh</button>
                    </div>
                    :
                    (loadingSearch || !dataSearch.artistResults)
                        ? Array.from({length: 12}).map((_, i) => (
                            <CardSkeleton key={i}/>
                        ))
                        :
                        dataSearch.artistResults.map(artist => {
                            return <Card
                                key={artist.id}
                                data={artist}
                                isPlaying={false}
                                onClick={() => navigate(`/artist/${artist.id}`)}
                                onContextMenu={() => {}}
                                onIconClick={() => {}}
                                getTitle={(a) => a.name}
                                getArtists={() => []}
                                getCoverUrl={() => dodo}
                            />
                        })
                }
            </div>

            {/*TODO what should this do*/}
            {/*<ContextMenu ctx={ctx}>*/}
            {/*    {*/}
            {/*        ctx.state && renderEntityActions(ctx.state.target, ctx.close, {*/}
            {/*            confirm,*/}
            {/*            refetch: ctx.state.target.type === "release" ? refreshSearch : refetchPlaylists,*/}
            {/*            role: authInfo.role,*/}
            {/*            username: authInfo.username*/}
            {/*        })*/}
            {/*    }*/}
            {/*</ContextMenu>*/}


            <div className={s.heading}>
                <h1>Songs</h1>
                <ToggleSectionButton
                    expanded={expandedSection.playlists}
                    onToggle={() => dispatch(homepageToggleExpandedSection("playlists"))}
                />
            </div>
            <div
                className={classNames(s.scroller, expandedSection.playlists && s.scrollerShow, errorSearch && s.scrollerError)}>
                {errorSearch && !dataSearch.trackResults ?
                    <div className={s.error}>
                        <p>{`Error: ${errorSearch}`}</p>
                        <button onClick={refreshSearch}>Refresh</button>
                    </div>
                    :
                    (loadingSearch || !dataSearch.trackResults)
                        ? Array.from({length: 12}).map((_, i) => (
                            <CardSkeleton key={i}/>
                        ))
                        :
                        dataSearch.trackResults.map(track => {
                            return <Card
                                key={track.id}
                                data={track}
                                isPlaying={false}
                                onClick={() => {}}
                                onContextMenu={() => {}}
                                onIconClick={() => {}}
                                getTitle={(t) => t.title}
                                getArtists={(t) =>
                                    t.artistNames.map((name, i) => ({
                                        id: i.toString(),
                                        name
                                    }))
                                }
                                getCoverUrl={() => dodo}
                            />
                        })
                }
            </div>
        </div>
    );
};

export default SearchPage;
