import car from "../../../../../resources/car.webm"
import style from "./NothingFound.module.css";
import {FC, useEffect, useRef} from "react";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import ModulatedVideo from "@renderer/components/Cat/ModulatedVideo";

interface props {
    text: string;
}

const NothingFound: FC<props> = ({text}) => {
    const catImg = useRef<HTMLVideoElement>(null);
    const {volume, isMuted} = useSelector((state: RootState) => state.rendererPlayer);

    useEffect(() => {
        if (!catImg.current || volume === null) return;
        catImg.current.playbackRate =  Math.round(volume * 10) / 10.0 * 2;
        if (isMuted) catImg.current.pause();
        if (!isMuted && catImg.current.paused) catImg.current.play();
    }, [catImg, volume, isMuted]);

    return (
        <div className={style.cat}>
            <ModulatedVideo
                src={car}
                style={{width: 200}}
                loop={true}
                speedMulti={2}
            ></ModulatedVideo>
            <h3>{text}</h3>
        </div>
    );
};

export default NothingFound;
