import s from "./PlaybackBar.module.css";
import {shallowEqual, useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "../../redux/store";
import {FaBackwardStep, FaForwardStep, FaPause} from "react-icons/fa6";
import {useEffect, WheelEvent} from "react";
import {FiVolume1, FiVolume2, FiVolumeX} from "react-icons/fi";
import SeekBar from "./SeekBar/SeekBar";
import {useDebounce} from "@uidotdev/usehooks";
import {setVolume, setIsMuted} from "@renderer/redux/rendererPlayerSlice";
import classNames from "classnames";
import {HiPlay} from "react-icons/hi2";
import {useLocation, useNavigate} from "react-router-dom";
import {isRemoteSong} from "../../../../shared/TrackInfo";
import {MoonLoader} from "react-spinners";
import placeholder from "../../../../../resources/img-placeholder-128x128.svg";

const PlaybackBar = () => {
    const loc = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const {volume, isMuted} = useSelector((state: RootState) => state.rendererPlayer);
    const prefsReady = volume !== null && isMuted !== null;
    const displayVolume = prefsReady ? round2Dec(!isMuted ? volume : 0) : 1;
    const debouncedVolume = useDebounce(displayVolume, 250);
    const { userPaused, waitingForData, currentTrack: track } = useSelector(
        (state: RootState) => ({
            userPaused: state.nativePlayer.userPaused,
            waitingForData: state.nativePlayer.waitingForData,
            currentTrack: state.nativePlayer.currentTrack
        }),
        shallowEqual
    );

    useEffect(() => {
        if (!prefsReady) return;

        window.api.setPreferences({
            volume: debouncedVolume,
            muted: isMuted
        });
    }, [debouncedVolume, isMuted]);

    useEffect(() => {
        const load = async () => {
            const prefs = await window.api.getPreferences();
            dispatch(setVolume(prefs.volume));
            dispatch(setIsMuted(prefs.muted));
        };
        void load();
    }, []);

    useEffect(() => {
        if (!prefsReady) return;

        window.api.setVolume(round2Dec(!isMuted ? volume : 0));
    }, [isMuted, volume]);

    const handleDrag = (v: number) => {
        dispatch(setIsMuted(false));
        dispatch(setVolume(v));
    };

    const handleWheel = (e: WheelEvent<HTMLInputElement>) => {
        if (!prefsReady) return;

        // direction of the scroll wheel
        const delta = e.deltaY < 0 ? 0.1 : -0.1;

        // Calculate the new volume using the current state value (volume)
        const newVolume = volume + delta;

        // The rest of your old logic (simplified for correctness):

        // Unmute immediately if adjusting volume
        dispatch(setIsMuted(false));

        // 2. Pass the final calculated number to the Zustand action
        // setVolume will handle the clamping (min/max) based on your store definition
        dispatch(setVolume(newVolume));
    };

    const pauseOrResume = () => {
        window.api.pauseOrResume();
    };

    const nextTrack = () => {
        window.api.nextTrack();
    };

    const previousTrack = () => {
        window.api.previousTrack();
    };

    const handleTitleClick = () => {
        if (track === null || !isRemoteSong(track)) return;
        const path = `/release/${track.releaseId}`;
        if (loc.pathname === path) return;
        navigate(path);
    };

    const percent = round2Dec(displayVolume * 100);
    const sliderBackground = `linear-gradient(to right, white 0%, white ${percent}%, #4c4c4c ${percent}%, #4c4c4c 100%)`;

    return (
        <div className={s.container}>
            <div className={s.trackInfo}>
                {track && (
                    <>
                        <div className={s.trackInfoCover}>
                            <img src={track.picture ? `${track.picture}?size=low` : placeholder} alt={"cover"}/>
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
            <div className={s.middleContainer}>
                <div className={classNames(s.row, s.controls)}>
                    <button className={classNames(s.btnAnim, s.backward)} onClick={() => previousTrack()}>
                        <FaBackwardStep/></button>
                    {waitingForData ?
                        <p className={s.controlMiddle}><MoonLoader speedMultiplier={1} color={"white"} size={25}/></p>
                        :
                        <button className={`${s.play} ${s.btnAnim} ${s.controlMiddle}`} onClick={() => pauseOrResume()}>
                            {
                                userPaused ?
                                    <HiPlay/>
                                    :
                                    <FaPause/>
                            }
                        </button>
                    }
                    <button className={classNames(s.btnAnim, s.forward)} onClick={() => nextTrack()}><FaForwardStep/>
                    </button>
                </div>
                <SeekBar/>
            </div>
            <div className={s.rightContainer}>
                <div className={s.volumeControl}>
                    <button onClick={() => dispatch(setIsMuted(!isMuted))} className={`${s.volBtn} ${s.btnAnim}`}>
                        {displayVolume > 0 ? displayVolume >= 1 ?
                            <FiVolume2 size={23}/>
                            :
                            <FiVolume1 size={23}/> : <FiVolumeX size={23}/>}
                    </button>
                    <input
                        style={{background: sliderBackground}}
                        className={s.slider}
                        type="range"
                        onWheel={(e) => handleWheel(e)}
                        min={0}
                        max={1}
                        step={0.01}
                        value={displayVolume}
                        onChange={(e) => handleDrag(Number(e.target.value))}
                    />
                    <p>{percent}</p>
                </div>
            </div>
        </div>
    );
};

const round2Dec = (v: number) => {
    return Math.round(v * 100) / 100;
};

export default PlaybackBar;
