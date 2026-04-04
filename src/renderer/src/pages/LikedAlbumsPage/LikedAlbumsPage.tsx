import NothingFound from "@renderer/components/NothingFound/NothingFound";
import {useNavigate} from "react-router-dom";
import useFetchData from "@renderer/hooks/useFetchData";
import {LikedReleaseDTO, ReleasePreviewDTO} from "../../../../shared/Api";
import {useCallback, useEffect, useRef} from "react";
import {useAppDispatch, useAppSelector} from "@renderer/redux/store";
import {setLikedReleases} from "@renderer/redux/likeSlice";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import Card from "@renderer/components/Card/Card";
import {useLoadCollection} from "@renderer/hooks/useLoadCollection";
import {useContextMenu} from "@renderer/hooks/useContextMenu";
import s from "./LikedAlbumsPage.module.css";
import {renderEntityActions} from "@renderer/contextMenus/menuHelper";
import {ContextMenu} from "@renderer/contextMenus/ContextMenu";


const LikedAlbumsPage = () => {
    const navigate = useNavigate();
    const {data: dataReleases, loading, error} = useFetchData<LikedReleaseDTO[]>("/like/releases");
    const scrollPageRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();
    const userPaused = useAppSelector(state => state.nativePlayer.userPaused);
    const track = useAppSelector(state => state.nativePlayer.currentTrack);
    const loadCollection = useLoadCollection();
    const ctx = useContextMenu();

    useEffect(() => {
        if(!dataReleases) return;
        dispatch(setLikedReleases(dataReleases.map(l => l.release.releaseId)));
    }, [dispatch, dataReleases]);

    const handleClick = useCallback(
        (release: ReleasePreviewDTO) => navigate(`/release/${release.releaseId}`),
        [navigate]
    );

    return (
        <div className={"pageWrapper pageWrapperFullHeight"} ref={scrollPageRef}>
            <h1>Saved Albums</h1>
            {!dataReleases && loading && <LoadingPage/>}

            {!loading && error && (
                <p className="errorPage">{error}</p>
            )}

            {
                !loading && dataReleases !== null && (
                    dataReleases.length > 0 ?
                        <div className={s.likedAlbums}>
                            {
                                dataReleases.map(t => {
                                    const isPlaying = track?.context.type === "release" && track?.context.id === t.release.releaseId && !userPaused;

                                    return <Card
                                        data={t.release}
                                        onIconClick={(e, data) => {
                                            e.stopPropagation();
                                            void loadCollection(data.releaseId, "release")}}
                                        key={t.release.releaseName}
                                        isPlaying={isPlaying}
                                        onClick={handleClick}
                                        onContextMenu={(e, data) => ctx.open(e, {type: "release", data})}
                                        getTitle={(r) => r.releaseName}
                                        getArtists={(r) => (r.artists.map(a => ({id: a.id, name: a.artistName})))}
                                        onArtistClick={(artist) => navigate(`/artist/${artist.id}`)}
                                        artistType={"artist"}
                                        getCoverUrl={(r) => r.coverArtUrl}
                                    />;
                                })
                            }
                        </div>
                        :
                        <NothingFound text={"You didn't save any albums yet."}/>
                )
            }

            <ContextMenu ctx={ctx}>
                {
                    ctx.state && renderEntityActions(ctx.state.target, ctx.close, {})
                }
            </ContextMenu>
        </div>
    );
};

export default LikedAlbumsPage;
