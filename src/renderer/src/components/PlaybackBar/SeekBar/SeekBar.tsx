import s from "../PlaybackBar.module.css";
import {MouseEvent, FC, useEffect, useRef, useState} from "react";
import {formatTime} from "../../../util/timeUtils";

interface SeekBarProps {
    //waveformData: number[];
    currentTime: number;
    duration: number;
}

const SeekBar: FC<SeekBarProps> = ({currentTime, duration}) => {
    //const canvasRef = useRef<HTMLCanvasElement>(null);
    const [coverUpWidth, setCoverUpWidth] = useState(1);
    const [hoverX, setHoverX] = useState<number>(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);
    const hoverTimeRef = useRef<number | null>(null);
    const lastSeekRef = useRef<number | null>(null);

    useEffect(() => {
        if (isDragging) return;

        if (lastSeekRef.current !== null) {
            const percent = lastSeekRef.current / duration;
            setCoverUpWidth(1 - percent);
            if (Math.abs(currentTime - lastSeekRef.current) < 0.05) {
                lastSeekRef.current = null;
            }
        } else {
            setCoverUpWidth(1 - currentTime / duration);
        }
    }, [currentTime, duration, isDragging]);

    /*useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !waveformData?.length) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.beginPath();

        const { width, height } = canvas;
        for (let i = 0; i < waveformData.length; i++) {
            const x = (i / waveformData.length) * width;
            const y = (1 - waveformData[i]) * height * 0.5;
            ctx.lineTo(x, y);
        }

        ctx.stroke();
    }, [waveformData]);*/

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
    }

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => {
        setIsHovering(false);
        if (!isDragging) hoverTimeRef.current = null;
    };

    return (
        <div className={s.seekBar}
             onMouseEnter={handleMouseEnter}
             onMouseLeave={handleMouseLeave}
             onMouseDown={handleMouseDown}
             onMouseMove={(e) => {
                 updateHover(e.clientX, false);
             }}
             ref={barRef}>
            <div className={s.barWrapper}>
                <canvas className={s.canvas}/>
                <div style={{
                    transform: `scaleX(${coverUpWidth})`,
                    transformOrigin: "right center",
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
