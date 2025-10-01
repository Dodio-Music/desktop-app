import s from "./PlaybackBar.module.css";
import {useSelector} from "react-redux";
import {RootState} from "../../redux/store";
import {FaPause, FaPlay} from "react-icons/fa6";
import {useEffect, useState, WheelEvent} from "react";
import {FiVolume1, FiVolume2, FiVolumeX} from "react-icons/fi";
import SeekBar from "./SeekBar/SeekBar";
import { useDebounce } from "@uidotdev/usehooks";
import {formatTime} from "../../util/timeUtils";

const PlaybackBar = () => {
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const displayVolume = round2Dec(!muted ? volume : 0);
    const debouncedVolume = useDebounce(displayVolume, 1000);
    const {currentTrack, duration, currentTime, userPaused, sourceType} = useSelector(
        (state: RootState) => state.player
    );

    useEffect(() => {
        window.api.setPreferences({volume, muted});
    }, [debouncedVolume]);

    useEffect(() => {
        const getSetPrefs = async () => {
            const prefs = await window.api.getPreferences();
            setVolume(prefs.volume);
            setMuted(prefs.muted);
        }
        void getSetPrefs();
    }, []);

    useEffect(() => {
        const v = !muted ? volume : 0;
        window.api.setVolume(round2Dec(v));
    }, [muted, volume]);

    const handleDrag = (v: number) => {
        setMuted(false);
        setVolume(v);
    }

    const handleWheel = (e: WheelEvent<HTMLInputElement>) => {
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        const m = muted;
        setMuted(false);
        setVolume((prev) => {
            let v = prev + delta;
            if(m) v = 0 + delta;
            return Math.min(1, Math.max(0, v));
        });
    }

    const pauseOrResume = () => {
        window.api.pauseOrResume();
    };

    const percent = round2Dec(displayVolume * 100);
    const sliderBackground = `linear-gradient(to right, white 0%, white ${percent}%, #4c4c4c ${percent}%, #4c4c4c 100%)`;

    return (
        <div className={s.container}>
            <div>
                <p>{currentTrack}</p>
            </div>
            <div className={s.middleContainer}>
                <div className={s.row}>
                    <button className={`${s.play} ${s.btnAnim}`} onClick={() => pauseOrResume()}>{userPaused ? <FaPlay/> :
                        <FaPause size={27}/>}</button>
                </div>
                <div className={s.row} id={s.middleRow}>
                    <p className={s.time}>{formatTime(currentTime)}</p>
                    <SeekBar currentTime={currentTime} duration={duration} sourceType={sourceType}/>
                    <p className={s.time}>{formatTime(duration)}</p>
                </div>
            </div>
            <div className={s.rightContainer}>
                <div className={s.volumeControl}>
                    <button onClick={() => setMuted(!muted)} className={`${s.volBtn} ${s.btnAnim}`}>
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
