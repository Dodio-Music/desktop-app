import s from "../PlaybackBar.module.css";
import placeholder from "../../../../../../resources/img-placeholder-128x128.svg";
import classNames from "classnames";
import {isRemoteSong} from "../../../../../shared/TrackInfo";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {useCallback} from "react";
import {useNavigate} from "react-router-dom";

const TrackInfo = () => {
    const navigate = useNavigate();

    const track = useSelector((state: RootState) => state.nativePlayer.currentTrack);

    const handleTitleClick = useCallback(() => {
        if (!track || !isRemoteSong(track)) return;

        const path = `/release/${track.releaseId}`;
        if (window.location.hash === `#${path}`) return;

        navigate(path);
    }, [track, navigate]);

    const coverSrc = track?.picture ? `${track.picture}?size=low` : placeholder;

    return (
        <div className={s.trackInfo}>
            {track && (
                <>
                    <div className={s.trackInfoCover}>
                        <img src={coverSrc} alt={"cover"}/>
                    </div>
                    <div className={s.trackInfoMeta}>
                        <p className={classNames(s.trackName, isRemoteSong(track) ? s.link : "")}
                           onClick={handleTitleClick}>{track.title}</p>
                        <p className={s.trackArtists}>
                            {track.artists.map((a, i) => (
                                <span key={a}>
                                    <span className={isRemoteSong(track) ? s.link : ""}>{a}</span>
                                    {i < track.artists.length - 1 ? ", " : ""}
                                </span>
                            ))}
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default TrackInfo;
