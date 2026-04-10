import {useRequiredParam} from "@renderer/hooks/useRequiredParam";
import useFetchData from "@renderer/hooks/useFetchData";
import {ArtistOverviewDTO} from "../../../../shared/Api";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import dodo from "../../../../../resources/dodo_whiteondark_512.png";
import s from "./ArtistPage.module.css";
import {Vibrant} from "node-vibrant/browser";
import {useCallback, useEffect, useRef, useState} from "react";
import {SongList} from "@renderer/components/SongList/SongList";
import {releaseTrackDTOListToSongEntries} from "@renderer/util/parseBackendTracks";
import {artistPopularSongRowSlots} from "@renderer/components/SongList/ColumnConfig";
import {useAppDispatch, useAppSelector} from "@renderer/redux/store";
import {followArtist, unfollowArtist} from "@renderer/redux/likeSlice";
import toast from "react-hot-toast";
import {errorToString} from "@renderer/util/errorToString";
import Card from "@renderer/components/Card/Card";
import {ContextMenu} from "@renderer/contextMenus/ContextMenu";
import {renderEntityActions} from "@renderer/contextMenus/menuHelper";
import {useNavigate} from "react-router-dom";
import {useLoadCollection} from "@renderer/hooks/useLoadCollection";
import {useContextMenu} from "@renderer/hooks/useContextMenu";
import {useConfirm} from "@renderer/hooks/useConfirm";
import {useAuth} from "@renderer/hooks/reduxHooks";

const ArtistPage = () => {
    const id = useRequiredParam("id");
    const {data: artistOverview, loading, error, refetch} = useFetchData<ArtistOverviewDTO>(`/artist/${id}/overview`);
    const scrollPageRef = useRef<HTMLDivElement>(null);
    const [bgColor, setBgColor] = useState("");
    const isFollowed = useAppSelector(
        state => !!state.likeSlice.followedArtists[artistOverview?.artist.artistId ?? -1]
    );
    const popularTracks = releaseTrackDTOListToSongEntries(artistOverview?.popularReleaseTracks ?? [], {type: "artist", id: artistOverview?.artist.artistId ?? -1, url: "/artist/" + artistOverview?.artist.artistId, name: "Artist Tracks"});
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const loadCollection = useLoadCollection();
    const ctx = useContextMenu();
    const confirm = useConfirm();
    const authInfo = useAuth().info;

    const userPaused = useAppSelector(state => state.nativePlayer.userPaused);
    const track = useAppSelector(state => state.nativePlayer.currentTrack);

    const displayedPopularTracks = popularTracks.slice(0, 5);

    useEffect(() => {
        const img = artistOverview ? `${artistOverview?.artist.avatarUrl}?size=low` : dodo;

        Vibrant.from(img)
            .getPalette()
            .then((p) => {
                const color =
                    p.DarkVibrant?.hex ||
                    p.Muted?.hex ||
                    "#222";

                setBgColor(color);
            })
            .catch(() => {
                setBgColor("#222");
            });
    }, [artistOverview]);

    const handleFollowArtist = useCallback(async () => {
        if(artistOverview?.artist.artistId === undefined) return;

        const res = await window.api.authRequest<string>("put", "/like", {likeScope: "ARTIST", likedId: artistOverview.artist.artistId, liked: !isFollowed});

        if(res.type !== "error") {
            if(!isFollowed) {
                dispatch(followArtist(artistOverview.artist.artistId));
                //toast.success(`Followed ${artistOverview.artist.artistName}.`);
            } else {
                dispatch(unfollowArtist(artistOverview.artist.artistId));
                //toast.success(`Unfollowed ${artistOverview.artist.artistName}.`);
            }
        } else {
            toast.error(errorToString(res.error));
        }
    }, [artistOverview, isFollowed, dispatch]);

    return (
        <div className={s.wrapper} ref={scrollPageRef}>
            {!artistOverview && loading && <LoadingPage/>}

            {!loading && error && (
                <p className="errorPage">{error}</p>
            )}

            {artistOverview && (
                <div className={s.artistPage}>
                    <div className={s.artistHeaderWrapper}>
                        <div
                            className={s.gradientOverlay}
                            style={{
                                background: `linear-gradient(180deg, ${bgColor} 0%, var(--color-bg-0) 100%)`
                            }}
                        />
                        <div className={s.artistHeader}>
                            <div className={s.artistAvatar}>
                                <img src={artistOverview.artist.avatarUrl ?? dodo}/>
                            </div>
                            <div className={s.artistHeaderInfo}>
                                <h1>{artistOverview.artist.artistName}</h1>
                            </div>
                        </div>
                    </div>
                    <div className={s.mainPage}>
                        <div className={s.controlBar}>
                            <button onClick={handleFollowArtist} className={s.follow}>{isFollowed ? "Unfollow" : "Follow"}</button>
                        </div>
                        <div className={s.horizWrapper}>
                            <div>
                                <div className={s.topTracks}>
                                    <h2 className={s.subHeading}>Top Tracks</h2>
                                    <p className={s.viewAll}>View All</p>
                                </div>
                                <SongList songs={displayedPopularTracks} hideHeader={true} slots={artistPopularSongRowSlots} gridTemplateColumns="30px 1fr 4ch 150px" scrollElement={scrollPageRef}/>
                            </div>
                            <div className={s.artistInfo}>
                                <div className={s.artistInfoMain}>
                                    <div>
                                        <h3 className={s.subHeading}>Followers</h3>
                                        <p>{artistOverview.followerCount}</p>
                                    </div>
                                    <div>
                                        <h3 className={s.subHeading}>Streams</h3>
                                        <p>{artistOverview.artist.streamCount}</p>
                                    </div>
                                    <div>
                                        <h3 className={s.subHeading}>Tracks</h3>
                                        <p>{artistOverview.totalTrackCount}</p>
                                    </div>
                                </div>
                                <div className={s.about}>
                                    <h2 className={s.subHeading}>About</h2>
                                    <p>{artistOverview.artist.bio ?? "This artist hasn't added a biography yet."}</p>
                                </div>
                            </div>
                        </div>
                        <div className={s.discography}>
                            <div className={s.topTracks}>
                                <h2 className={s.subHeading}>Discography</h2>
                                <p className={s.viewAll}>View Full Discography</p>
                            </div>
                            <div className={s.latestReleases}>
                                {
                                    artistOverview.latestReleases.map(r => {
                                        const isPlaying = track?.context.type === "release" && track?.context.id === r.releaseId && !userPaused;

                                        return <Card
                                            key={r.releaseId}
                                            onClick={() => navigate(`/release/${r.releaseId}`)}
                                            isPlaying={isPlaying}
                                            coverUrl={r.coverArtUrl}
                                            title={r.releaseName}
                                            releaseInfo={({
                                                releaseType: r.releaseType,
                                                releaseYear: new Date(Date.parse(r.releaseDate)).getFullYear()
                                            })}
                                            onContextMenu={(e) => ctx.open(e, {type: "release", data: r})}
                                            onPlayClick={(e) => {
                                                e.stopPropagation();
                                                void loadCollection(r.releaseId, "release")
                                            }}/>
                                    })
                                }
                            </div>
                        </div>
                        <ContextMenu ctx={ctx}>
                            {
                                ctx.state && renderEntityActions(ctx.state.target, ctx.close, {
                                    confirm,
                                    refetch,
                                    role: authInfo.role,
                                    username: authInfo.username
                                })
                            }
                        </ContextMenu>

                    </div>
                </div>
            )}
        </div>
    );
};

export default ArtistPage;
