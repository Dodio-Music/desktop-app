import s from "../PlaybackBar.module.css";
import {setIsMuted, setVolume} from "@renderer/redux/rendererPlayerSlice";
import {FiVolume1, FiVolume2, FiVolumeX} from "react-icons/fi";
import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "@renderer/redux/store";
import {useEffect, useMemo, WheelEvent} from "react";
import {useDebounce} from "@uidotdev/usehooks";

const PlayerTools = () => {
    const dispatch = useDispatch<AppDispatch>();
    const {volume, isMuted} = useSelector((state: RootState) => state.rendererPlayer);
    const prefsReady = volume !== null && isMuted !== null;

    useEffect(() => {
        const load = async () => {
            const prefs = await window.api.getPreferences();
            dispatch(setVolume(prefs.volume));
            dispatch(setIsMuted(prefs.muted));
        };
        void load();
    }, []);

    const displayVolume = useMemo(() => {
        return prefsReady ? round2Dec(!isMuted ? volume : 0) : 1;
    }, [prefsReady, isMuted, volume]);

    const debouncedVolume = useDebounce(displayVolume, 250);

    const percent = useMemo(
        () => round2Dec(displayVolume * 100),
        [displayVolume]
    );

    useEffect(() => {
        if (!prefsReady) return;

        window.api.setPreferences({
            volume: debouncedVolume,
            muted: isMuted
        });
    }, [debouncedVolume, isMuted]);

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

    const sliderBackground = useMemo(() => (
        `linear-gradient(to right, white 0%, white ${percent}%, #4c4c4c ${percent}%, #4c4c4c 100%)`
    ), [percent]);

    return (
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
    );
};

const round2Dec = (v: number) => {
    return Math.round(v * 100) / 100;
};

export default PlayerTools;
