import car from "./car.webm"
import style from "./SettingsPage.module.css"
import {useEffect, useRef} from "react";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";

const SettingsPage = () => {

    const catImg = useRef<HTMLVideoElement>(null);
    const {volume, isMuted} = useSelector((state: RootState) => state.rendererPlayer);

    useEffect(() => {
        if (!catImg.current) return;
        catImg.current.playbackRate =  Math.round(volume * 10) / 10.0 * 2;
        if (isMuted) catImg.current.pause();
        if (!isMuted && catImg.current.paused) catImg.current.play();
        console.log("test")
    }, [catImg, volume, isMuted]);

    return (
        <div className={style.cat}>
            <video
                src={car}
                ref={catImg}
                style={{width: 200}}
                autoPlay
                loop
            />
            <h3>Nothing to see here</h3>
        </div>
    );
};

export default SettingsPage;
