import s from "../PlaybackBar.module.css";
import placeholder from "../../../../../../resources/img-placeholder-128x128.svg";
import classNames from "classnames";
import {isLocalSong, isRemoteSong} from "../../../../../shared/TrackInfo";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import {useCallback, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import OpenableCover from "@renderer/components/OpenableCover/OpenableCover";

const TrackInfo = () => {
    const navigate = useNavigate();
    const activeTrack = useSelector((state: RootState) => state.nativePlayer.currentTrack);
    const [fullCover, setFullCover] = useState<string | null>(null);

    useEffect(() => {
        if (!activeTrack) {
            setFullCover(null);
            return;
        }

        let cancelled = false;

        if(isLocalSong(activeTrack)) {
            window.api.getFullCover(activeTrack.fullPath)
                .then(async (dataUrl: string | null) => {
                    if (!dataUrl || cancelled) return;
                    setFullCover(dataUrl);
                });
        } else if(isRemoteSong(activeTrack) && activeTrack.picture) {
            setFullCover(activeTrack.picture + "?size=original");
        }

        return () => {
            cancelled = true;
        };
    }, [activeTrack?.title]);

    const handleTitleClick = useCallback(() => {
        if (!activeTrack) return;
        let path: string;

        if (isRemoteSong(activeTrack)) path = `/release/${activeTrack.releaseId}`;
        else path = "/collection/local";

        const replace = window.location.hash === `#${path}`;

        navigate(path, {replace, state: {scroll: {scrollToId: activeTrack.id, timestamp: Date.now()}}});
    }, [activeTrack, navigate]);

    let thumbnail = placeholder;
    if (activeTrack && isRemoteSong(activeTrack) && activeTrack.picture) {
        thumbnail = `${activeTrack.picture}?size=low`;
    } else if (activeTrack && isLocalSong(activeTrack)) {
        thumbnail = activeTrack.picture || placeholder;
    }

    return (
        <div className={s.trackInfo}>
            {activeTrack && (
                <>
                    <div className={s.trackInfoCover}>
                        <OpenableCover thumbnailSrc={thumbnail} fullSrc={fullCover}
                                       enabled={thumbnail !== placeholder}/>
                    </div>
                    <div className={s.trackInfoMeta}>
                        <p className={classNames(s.trackName, s.link)}
                           onClick={handleTitleClick}>{activeTrack.title}</p>
                        <p className={s.trackArtists}>
                            {activeTrack.artists.map((a, i) => (
                                <span key={a}>
                                    <span className={isRemoteSong(activeTrack) ? s.link : ""}>{a}</span>
                                    {i < activeTrack.artists.length - 1 ? ", " : ""}
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
