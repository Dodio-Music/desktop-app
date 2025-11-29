import React, {useEffect, useRef} from 'react';
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";

interface ModulatedVideoProps{
    src: string;
    style?: React.CSSProperties
    autoplay?: boolean
    loop?: boolean
    speedMulti?: number

}

const ModulatedVideo: React.FC<ModulatedVideoProps> = ({src, style, autoplay = false, loop = false, speedMulti = 1}) => {

    const catImg = useRef<HTMLVideoElement>(null);
    const {volume, isMuted} = useSelector((state: RootState) => state.rendererPlayer);

    useEffect(() => {
        if (!catImg.current || volume === null) return;
        catImg.current.playbackRate =  Math.round(volume * 10) / 10.0 * speedMulti;
        if (isMuted) catImg.current.pause();
        if (!isMuted && catImg.current.paused) catImg.current.play();
    }, [catImg, volume, isMuted]);

    return (
            <video
                src={src}
                ref={catImg}

                style={style}
                autoPlay={autoplay}
                loop={loop}
            />
    );
};

export default ModulatedVideo;
