import s from "./PlaybackBar.module.css";
import {useSelector} from "react-redux";
import {RootState} from "../../redux/store";
import {FaPause, FaPlay} from "react-icons/fa6";

const PlaybackBar = () => {
    const {currentTrack, duration, currentTime, userPaused} = useSelector(
        (state: RootState) => state.player
    )

    const pauseOrResume = () => {
        window.api.pauseOrResume();
    }

    function formatTime(seconds: number): string {
        const totalSeconds = Math.round(seconds);
        const minutes = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    return (
        <div className={s.container}>
            <div>
                <p>{currentTrack}</p>
            </div>
            <div className={s.middleContainer}>
                <div className={s.row}>
                    <button className={s.play} onClick={() => pauseOrResume()}>{userPaused ? <FaPlay /> : <FaPause /> }</button>
                </div>
                <div className={s.row}>
                    <p>{formatTime(currentTime)}</p>
                    <p>{formatTime(duration)}</p>
                </div>
            </div>
            <div>
            </div>
        </div>
    );
};

export default PlaybackBar;
