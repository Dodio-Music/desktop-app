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

const ArtistPage = () => {
    const id = useRequiredParam("id");
    const {data: artistOverview, loading, error} = useFetchData<ArtistOverviewDTO>(`/artist/${id}/overview`);
    const scrollPageRef = useRef<HTMLDivElement>(null);
    const [bgColor, setBgColor] = useState("");
    const isFollowed = useAppSelector(
        state => !!state.likeSlice.followedArtists[artistOverview?.artist.artistId ?? -1]
    );
    const popularTracks = releaseTrackDTOListToSongEntries(artistOverview?.popularReleaseTracks ?? [], {type: "artist", id: artistOverview?.artist.artistId ?? -1, url: "/artist/" + artistOverview?.artist.artistId, name: "Artist Tracks"});
    const dispatch = useAppDispatch();

    useEffect(() => {
        const img = artistOverview?.artist.avatarUrl ?? dodo;

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
                toast.success(`Followed ${artistOverview.artist.artistName}.`);
            } else {
                dispatch(unfollowArtist(artistOverview.artist.artistId));
                toast.success(`Unfollowed ${artistOverview.artist.artistName}.`);
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
                                <h2 className={s.subHeading}>Popular</h2>
                                <SongList songs={popularTracks} hideHeader={true} slots={artistPopularSongRowSlots} gridTemplateColumns="30px 1fr 100px 200px" scrollElement={scrollPageRef}/>
                            </div>
                            <div className={s.artistInfo}>
                                <div className={s.artistInfoMain}>
                                    <div>
                                        <h3>Followers</h3>
                                        <p>{artistOverview.followerCount}</p>
                                    </div>
                                    <div>
                                        <h3>Streams</h3>
                                        <p>{artistOverview.artist.streamCount}</p>
                                    </div>
                                    <div>
                                        <h3>Tracks</h3>
                                        <p>{artistOverview.totalTrackCount}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArtistPage;
