import s from "@renderer/components/PlaybackBar/PlaybackBar.module.css";
import classNames from "classnames";
import {TbArrowsShuffle, TbRepeat, TbRepeatOff, TbRepeatOnce} from "react-icons/tb";
import {FaBackwardStep, FaForwardStep, FaPause} from "react-icons/fa6";
import {MoonLoader} from "react-spinners";
import {HiPlay} from "react-icons/hi2";
import {RepeatMode} from "../../../../../shared/PlayerState";
import SeekBar from "@renderer/components/PlaybackBar/PlaybackControls/SeekBar/SeekBar";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";

const PlaybackControls = () => {
    const userPaused = useSelector((state: RootState) => state.nativePlayer.userPaused);
    const waitingForData = useSelector((state: RootState) => state.nativePlayer.waitingForData);
    const repeatMode = useSelector((state: RootState) => state.nativePlayer.repeatMode);

    const pauseOrResume = () => {
        window.api.pauseOrResume();
    };

    const nextTrack = () => {
        window.api.nextTrack();
    };

    const previousTrack = () => {
        window.api.previousTrack();
    };

    const cycleRepeat = () => {
        window.api.cycleRepeatMode();
    }

    return (
        <div className={s.middleContainer}>
            <div className={classNames(s.row, s.controls)}>
                <button className={classNames(s.btnAnim, s.disabledBtn)}>
                    <TbArrowsShuffle size={24}/>
                </button>
                <button className={classNames(s.btnAnim, s.backward)} onClick={previousTrack}>
                    <FaBackwardStep/></button>
                {waitingForData ?
                    <p className={s.controlMiddle}><MoonLoader speedMultiplier={1} color={"white"} size={23}/></p>
                    :
                    <button className={`${s.play} ${s.btnAnim} ${s.controlMiddle}`} onClick={pauseOrResume}>
                        {
                            userPaused ?
                                <HiPlay/>
                                :
                                <FaPause/>
                        }
                    </button>
                }
                <button className={classNames(s.btnAnim, s.forward)} onClick={nextTrack}><FaForwardStep/>
                </button>
                <button className={classNames(s.btnAnim, s.repeatButton)} onClick={cycleRepeat}>
                    {repeatMode === RepeatMode.One ?
                        <TbRepeatOnce size={24}/>
                        :
                        repeatMode === RepeatMode.All ?
                            <TbRepeat size={24}/>
                            :
                            <TbRepeatOff size={24} className={s.disabledBtn}/>
                    }
                </button>
            </div>
            <SeekBar/>
        </div>
    );
};

export default PlaybackControls;
