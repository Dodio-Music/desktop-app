import s from "../PlaybackBar.module.css";
import {MouseEvent, FC, useEffect, useRef, useState} from "react";
import {formatTime} from "../../../util/timeUtils";
import {SourceType} from "../../../../../shared/PlayerState";
import {useSelector} from "react-redux";
import {RootState} from "../../../redux/store";

interface SeekBarProps {
    currentTime: number;
    duration: number;
    sourceType: SourceType;
}

enum SeekBarDisplayStyle {
    DEFAULT, WAVEFORM
}

const SeekBar: FC<SeekBarProps> = ({currentTime, duration, sourceType}) => {
    // CUSTOMIZABLE
    const [displayStyle] = useState(SeekBarDisplayStyle.DEFAULT);
    const [seekbarWidth] = useState(600);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [peaks, setPeaks] = useState<number[]>([]);
    const [coverUpWidth, setCoverUpWidth] = useState(1);
    const [hoverX, setHoverX] = useState<number>(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);
    const hoverTimeRef = useRef<number | null>(null);
    const lastSeekRef = useRef<number | null>(null);
    const seekbarHeight = displayStyle === SeekBarDisplayStyle.WAVEFORM ? "30px" : "5px";
    const {trackChangeToken, latency} = useSelector((state: RootState) => state.player);

    useEffect(() => {
        //setDisplayStyle(sourceType === "local" ? SeekBarDisplayStyle.WAVEFORM : SeekBarDisplayStyle.DEFAULT);
    }, [sourceType]);

    useEffect(() => {
        if (isDragging) return;

        if (lastSeekRef.current !== null) {
            const percent = lastSeekRef.current / duration;
            setCoverUpWidth(1 - percent);
            if (Math.abs((currentTime + latency) - lastSeekRef.current) < 0.05) {
                lastSeekRef.current = null;
            }
        } else {
            setCoverUpWidth(1 - currentTime / duration);
        }
    }, [currentTime, duration, isDragging]);

    useEffect(() => {
        drawWaveform();
    }, [peaks, displayStyle]);

    const drawWaveform = () => {
        const canvas = canvasRef.current;
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx || !canvas) return;

        const {width, height} = canvas;
        ctx.clearRect(0, 0, width, height);

        if(displayStyle !== SeekBarDisplayStyle.WAVEFORM) return;
        if(!peaks) return;

        const middle = height / 2;
        const barWidth = width / peaks.length;
        const minHeightFraction = 0.075;

        const drawPeaks = () => {
            if (!peaks) return;

            for (let i = 0; i < peaks.length; i++) {
                let value = peaks[i] * 0.95;
                value = Math.max(value, minHeightFraction);
                const barHeight = value * height;
                const x = i * barWidth;
                ctx.fillRect(x, middle - barHeight / 2, barWidth, barHeight);
            }
        };

        ctx.fillStyle = "rgb(255,255,255)";
        drawPeaks();
    };

    useEffect(() => {
        const unsubscribe = window.api.onWaveformData((peaks) => {
            setPeaks(peaks);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        setPeaks([]);
    }, [trackChangeToken]);

    const updateHover = (clientX: number, dragging: boolean) => {
        if (!barRef.current || duration <= 0) return;
        const rect = barRef.current.getBoundingClientRect();
        const relativeX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
        const percent = relativeX / rect.width;
        const newTime = percent * duration;
        hoverTimeRef.current = newTime;
        setHoverX(relativeX);

        if (dragging) setCoverUpWidth(1 - newTime / duration);
    };

    const handleMouseDown = (e: MouseEvent) => {
        setIsDragging(true);
        updateHover(e.clientX, true);

        const handleMove = (e: globalThis.MouseEvent) => updateHover(e.clientX, true);
        const handleUp = () => {
            if (hoverTimeRef.current !== null) {
                window.api.seek(hoverTimeRef.current);
                lastSeekRef.current = hoverTimeRef.current;
            }
            setIsDragging(false);


            document.removeEventListener("mousemove", handleMove);
            document.removeEventListener("mouseup", handleUp);
        };

        document.addEventListener("mousemove", handleMove);
        document.addEventListener("mouseup", handleUp);
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => {
        setIsHovering(false);
        if (!isDragging) hoverTimeRef.current = null;
    };

    return (
        <div
            style={{width: seekbarWidth}}
            className={s.seekBar}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseMove={(e) => {
                updateHover(e.clientX, false);
            }}
            ref={barRef}>
            <div className={s.barWrapper} style={{height: seekbarHeight}}>
                <canvas className={s.canvas} ref={canvasRef} width={seekbarWidth} height={seekbarHeight}
                        style={displayStyle === SeekBarDisplayStyle.WAVEFORM ? {backgroundColor: "transparent"} : {borderRadius: "2px"}}/>
                <div style={{
                    transform: `scaleX(${coverUpWidth})`
                }} className={s.coverUp}/>
                {(isDragging || isHovering) && hoverTimeRef.current !== null && (
                    <div
                        className={s.tooltip}
                        style={{left: hoverX}}
                    >
                        {formatTime(hoverTimeRef.current)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SeekBar;
