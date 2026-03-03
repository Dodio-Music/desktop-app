import useFetchData from "@renderer/hooks/useFetchData";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import NothingFound from "@renderer/components/NothingFound/NothingFound";
import {SongList} from "@renderer/components/SongList/SongList";
import {likedTracksSongRowSlots} from "@renderer/components/SongList/ColumnConfig";
import {likedTracksToSongEntries} from "@renderer/util/parseBackendTracks";
import {LikedTrackDTO} from "../../../shared/Api";
import {useEffect, useRef} from "react";
import {useNavigate} from "react-router-dom";
import {useAppDispatch, useAppSelector} from "@renderer/redux/store";
import {setLikedTracks} from "@renderer/redux/likeSlice";

const LikedTracksPage = () => {
    const navigate = useNavigate();
    const {data: likedTracks, loading, error} = useFetchData<LikedTrackDTO[]>("/like/tracks");
    const scrollPageRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();
    const likedIds = useAppSelector(state => state.likeSlice.likedTracks);

    const songEntries = likedTracksToSongEntries(likedTracks, likedIds);

    useEffect(() => {
        if(!likedTracks) return;

        dispatch(setLikedTracks(likedTracks.map(l => l.track.releaseTrackId)));

    }, [dispatch, likedTracks]);

    return (
        <div className={"pageWrapper pageWrapperFullHeight"} ref={scrollPageRef}>
            <h1>Liked Songs</h1>
            {!likedTracks && loading && <LoadingPage/>}

            {!loading && error && (
                <p className="errorPage">{error}</p>
            )}

            { !loading && (
                songEntries.length > 0 ?
                    <SongList
                        scrollElement={scrollPageRef}
                        songs={songEntries}
                        slots={likedTracksSongRowSlots}
                        gridTemplateColumns="30px 4fr 2.5fr 2fr 140px"
                        navigate={navigate}
                    />
                    :
                    <NothingFound text={"You didn't like any tracks yet."}/>
            )}
        </div>
    );
};

export default LikedTracksPage;
