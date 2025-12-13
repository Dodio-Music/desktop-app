import s from "./HomePage.module.css";
import useFetchData from "@renderer/hooks/useFetchData";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {ReleaseDTO, ReleasePreviewDTO} from "../../../../shared/Api";
import {releaseToSongEntries} from "@renderer/util/parseBackendTracks";
import {useNavigate} from "react-router-dom";
import {FaPause, FaPlay} from "react-icons/fa6";
import {MouseEvent} from "react";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {isRemoteSong} from "../../../../shared/TrackInfo";
import toast from "react-hot-toast";

const HomePage = () => {
    const navigate = useNavigate();
    const {data, loading, error} = useFetchData<ReleasePreviewDTO[]>("/api/release/all");
    const {currentTrack: track, userPaused} = useSelector((state: RootState) => state.nativePlayer);

    if (loading) return <LoadingPage/>;

    const handleIconClick = async (e: MouseEvent, releasePrev: ReleasePreviewDTO) => {
        e.stopPropagation();
        if (track && isRemoteSong(track) && track.releaseId === releasePrev.releaseId) {
            window.api.pauseOrResume();
        } else {
            const req = await window.api.authRequest("get", `/api/release/${releasePrev.releaseId}`);
            if(req.type === "error") {
                toast.error("Couldn't load release!");
                return;
            }

            const releaseTracks = releaseToSongEntries(req.value as ReleaseDTO);
            window.api.loadTrackRemote(releaseTracks[0], releaseTracks);
        }
    };

    if (error || data === null) return <p className={"errorPage"}>{error ?? "Couldn't load homepage!"}</p>;

    return (
        <div className={`pageWrapper ${s.wrapper}`}>
            <h1>New Releases</h1>
            {
                error || !data ?
                    <p>{error ?? "An unknown error occurred!"}</p>
                    :
                    <div className={s.releases}>
                        {data.map(t =>
                            <div key={t.releaseName} className={s.release}
                                 onClick={() => navigate(`/release/${t.releaseId}`)}>
                                <div className={s.coverWrapper}>
                                    <img alt={"cover"} className={s.cover} src={`${t.coverArtUrl}?size=low`}/>
                                    <button className={s.play} onClick={(e) => handleIconClick(e, t)}>
                                        {track && isRemoteSong(track) && track.releaseId === t.releaseId && !userPaused ?
                                            <FaPause size={24} className={s.pauseIcon}/>
                                            :
                                            <FaPlay size={24} className={s.playIcon}/>
                                        }
                                    </button>
                                </div>
                                <p className={`${s.title} ${s.link}`}>{t.releaseName}</p>
                                <p className={`${s.artist} ${s.link}`}>{t.artists.join(", ")}</p>
                            </div>
                        )}
                    </div>
            }
        </div>
    );
};

export default HomePage;
