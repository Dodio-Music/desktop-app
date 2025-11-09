import s from "./PlaybackBar.module.css";
import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "../../redux/store";
import {FaBackwardStep, FaForwardStep, FaPause} from "react-icons/fa6";
import {useEffect, WheelEvent} from "react";
import {FiVolume1, FiVolume2, FiVolumeX} from "react-icons/fi";
import SeekBar from "./SeekBar/SeekBar";
import { useDebounce } from "@uidotdev/usehooks";
import {formatTime} from "../../util/timeUtils";
import {setVolume, setIsMuted} from "@renderer/redux/rendererPlayerSlice";
import classNames from "classnames";
import {HiPlay} from "react-icons/hi2";

const PlaybackBar = () => {
    const dispatch = useDispatch<AppDispatch>();
    const {volume, isMuted} = useSelector((state: RootState) => state.rendererPlayer);
    const displayVolume = round2Dec(!isMuted ? volume : 0);
    const debouncedVolume = useDebounce(displayVolume, 1000);
    const {duration, currentTime, userPaused, currentTrack} = useSelector(
        (state: RootState) => state.nativePlayer
    );

    useEffect(() => {
        window.api.setPreferences({volume, muted: isMuted});
    }, [debouncedVolume]);

    useEffect(() => {
        const getSetPrefs = async () => {
            const prefs = await window.api.getPreferences();
            dispatch(setVolume(prefs.volume));
            dispatch(setIsMuted(prefs.muted));
        }
        void getSetPrefs();
    }, []);

    useEffect(() => {
        const v = !isMuted ? volume : 0;
        window.api.setVolume(round2Dec(v));
    }, [isMuted, volume]);

    const handleDrag = (v: number) => {
        dispatch(setIsMuted(false));
        dispatch(setVolume(v));
    }

    const handleWheel = (e: WheelEvent<HTMLInputElement>) => {
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
    }

    const previousTrack = () => {
        window.api.previousTrack();
    }

    const percent = round2Dec(displayVolume * 100);
    const sliderBackground = `linear-gradient(to right, white 0%, white ${percent}%, #4c4c4c ${percent}%, #4c4c4c 100%)`;

    return (
        <div className={s.container}>
            <div className={s.trackInfo}>
                {currentTrack && (
                    <>
                        <div className={s.trackInfoCover}>
                            <img src={currentTrack.picture} alt={"cover"}/>
                        </div>
                        <div className={s.trackInfoMeta}>
                            <p className={s.trackName}>{currentTrack.title}</p>
                            <p className={s.trackArtists}>{currentTrack.artists.join(", ")}</p>
                        </div>
                    </>
                )}
            </div>
            <div className={s.middleContainer}>
                <div className={classNames(s.row, s.controls)}>
                    <button className={classNames(s.btnAnim, s.backward)} onClick={() => previousTrack()}><FaBackwardStep /></button>
                    <button className={`${s.play} ${s.btnAnim}`} onClick={() => pauseOrResume()}>{userPaused ?<HiPlay /> :
                        <FaPause />}</button>
                    <button className={classNames(s.btnAnim, s.forward)} onClick={() => nextTrack()}><FaForwardStep /></button>
                </div>
                <div className={s.row} id={s.middleRow}>
                    <p className={s.time}>{formatTime(Math.max(currentTime, 0))}</p>
                    <SeekBar/>
                    <p className={s.time}>{formatTime(duration)}</p>
                </div>
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
}

export default PlaybackBar;
