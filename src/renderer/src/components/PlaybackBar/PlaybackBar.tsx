import s from "./PlaybackBar.module.css";
import TrackInfo from "@renderer/components/PlaybackBar/TrackInfo/TrackInfo";
import PlayerTools from "@renderer/components/PlaybackBar/PlayerTools/PlayerTools";
import PlaybackControls from "@renderer/components/PlaybackBar/PlaybackControls/PlaybackControls";

const PlaybackBar = () => {
    return (
        <div className={s.container}>
            <TrackInfo/>
            <PlaybackControls/>
            <PlayerTools/>
        </div>
    );
};

export default PlaybackBar;
