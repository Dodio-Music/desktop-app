import useFetchData from "@renderer/hooks/useFetchData";
import {ReleaseDTO} from "../../../../shared/Api";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {useNavigate, useParams} from "react-router-dom";
import toast from "react-hot-toast";
import {useEffect, useRef} from "react";
import {SongList} from "@renderer/components/SongList/SongList";
import {releaseToSongEntries} from "@renderer/util/parseBackendTracks";
import {remoteSongRowSlots} from "@renderer/components/SongList/ColumnConfig";
import s from "./ReleaseView.module.css";
import {formatTime} from "@renderer/util/timeUtils";

const ReleaseView = () => {
    const navigate = useNavigate();
    const {id} = useParams();
    const mounted = useRef(false);

    useEffect(() => {
        if (id || mounted.current) return;
        toast.error("No ID provided for ReleasePage!");
        navigate(-1);
        mounted.current = true;
    }, [id]);

    const {data: release, loading, error} = useFetchData<ReleaseDTO>(`/api/release/${id}`);

    if (loading) return <LoadingPage/>;

    if (error || release === null) return <p className={"errorPage"}>{error ?? "Couldn't load release!"}</p>;

    const songEntries = releaseToSongEntries(release);

    const albumLengthSeconds = release.releaseTracks.map(r => r.track.duration).reduce((partialSum, a) => partialSum + a, 0);

    return (
        <div className={s.pageWrapper}>
            <div className={s.headerWrapper}>
                <div className={s.infoWrapper}>
                    <div className={s.cover}>
                        <img alt={"cover"} className={s.cover} src={`${release.coverArtUrl}?size=mid`}/>
                    </div>
                    <div className={s.releaseInfo}>
                        <div>
                            <p className={s.releaseTitle}>{release.releaseName}</p>
                            <p className={s.artists}>{release.artists.map(((a, i) => <span key={a}><span className={s.link}>{a}</span>{i < release.artists.length - 1 ? ", " : ""}</span>))}</p>
                        </div>
                        <p className={s.tracksInfo}>{release.releaseTracks.length} Track{release.releaseTracks.length > 1 && "s"} ({formatTime(albumLengthSeconds)})</p>
                    </div>
                </div>
            </div>
            <SongList
                songs={songEntries}
                slots={remoteSongRowSlots}
                gridTemplateColumns={"30px 1fr 100px 250px"}
            />
        </div>
    );
};

export default ReleaseView;
