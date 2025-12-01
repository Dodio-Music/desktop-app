import s from "./HomePage.module.css";
import useFetchData from "@renderer/hooks/useFetchData";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {ReleaseDTO} from "../../../../shared/Api";
import {releaseToSongEntries} from "@renderer/util/parseBackendTracks";
import {useNavigate} from "react-router-dom";
import {FaPause, FaPlay} from "react-icons/fa6";
import {MouseEvent} from "react";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {isRemoteSong} from "../../../../shared/TrackInfo";

const HomePage = () => {
    const navigate = useNavigate();
    const {data, loading, error} = useFetchData<ReleaseDTO[]>("/api/release/all");
    const {currentTrack, userPaused, pendingTrack} = useSelector((state: RootState) => state.nativePlayer);
    const track = pendingTrack ?? currentTrack;

    if (loading) return <LoadingPage/>;

    const handleIconClick = (e: MouseEvent, release: ReleaseDTO) => {
        e.stopPropagation();
        if (track && isRemoteSong(track) && track.releaseId === release.releaseId) {
            window.api.pauseOrResume();
        } else {
            const releaseTracks = releaseToSongEntries(release);
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
