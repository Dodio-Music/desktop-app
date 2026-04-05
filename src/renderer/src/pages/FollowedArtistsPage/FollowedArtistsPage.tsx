import NothingFound from "@renderer/components/NothingFound/NothingFound";
import {useNavigate} from "react-router-dom";
import useFetchData from "@renderer/hooks/useFetchData";
import {ArtistFollowDTO} from "../../../../shared/Api";
import {useCallback, useEffect, useRef} from "react";
import {useAppDispatch} from "@renderer/redux/store";
import {useContextMenu} from "@renderer/hooks/useContextMenu";
import {setFollowedArtists} from "@renderer/redux/likeSlice";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import s from "./FollowedArtistsPage.module.css";
import {ContextMenu} from "@renderer/contextMenus/ContextMenu";
import {renderEntityActions} from "@renderer/contextMenus/menuHelper";
import dodo from "../../../../../resources/dodo_whiteondark_512.png";

const FollowedArtistsPage = () => {
    const navigate = useNavigate();
    const {data: dataArtists, loading, error} = useFetchData<ArtistFollowDTO[]>("/like/artists");
    const scrollPageRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();
    const ctx = useContextMenu();

    useEffect(() => {
        if (!dataArtists) return;
        dispatch(setFollowedArtists(dataArtists.map(l => l.artist.artistId)));
    }, [dispatch, dataArtists]);

    const handleClick = useCallback(
        (artist: ArtistFollowDTO) => navigate(`/artist/${artist.artist.artistId}`),
        [navigate]
    );

    return (
        <div className={"pageWrapper pageWrapperFullHeight"} ref={scrollPageRef}>
            <h1>Artists You Follow</h1>
            {!dataArtists && loading && <LoadingPage/>}

            {!loading && error && (
                <p className="errorPage">{error}</p>
            )}

            {
                !loading && dataArtists !== null && (
                    dataArtists.length > 0 ?
                        <div className={s.followedArtists}>
                            {
                                dataArtists.map(f => (
                                    <div className={s.card} key={f.artist.artistId} onClick={() => handleClick(f)}>
                                        <div className={s.coverWrapper}>
                                            <img alt="cover" className={s.cover}
                                                 src={`${f.artist.avatarUrl ? f.artist.avatarUrl + "?size=low" : dodo}`}
                                                 loading="lazy"/>
                                        </div>
                                        <p className={`${s.title}`}>{f.artist.artistName}</p>
                                    </div>
                                ))
                            }
                        </div>
                        :
                        <NothingFound text={"You don't follow any artists."}/>
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

export default FollowedArtistsPage;
