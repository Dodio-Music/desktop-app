import s from "../PlaybackBar.module.css";
import {MouseEvent, useEffect, useRef, useState} from "react";
import {formatTime} from "../../../util/timeUtils";
import {useSelector} from "react-redux";
import {RootState} from "../../../redux/store";

enum SeekBarDisplayStyle {
    DEFAULT, WAVEFORM
}

const wantedDisplayStyle = SeekBarDisplayStyle.WAVEFORM;

const SeekBar = () => {
    // CUSTOMIZABLE
    const [displayStyle, setDisplayStyle] = useState(wantedDisplayStyle);
    const [seekbarWidth] = useState(600);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [peaks, setPeaks] = useState<number[]>([]);
    const [hoverX, setHoverX] = useState<number>(0);
    const loadingProgressRef = useRef<number>(0);
    const [isHovering, setIsHovering] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);
    const hoverTimeRef = useRef<number | null>(null);
    const dragTimeRef = useRef<number | null>(null);
    const lastSeekRef = useRef<number | null>(null);
    const seekbarHeight = displayStyle === SeekBarDisplayStyle.WAVEFORM ? 25 : 5;
    const {
        trackChangeToken,
        latency,
        duration,
        currentTime,
        sourceType,
        playbackRunning
    } = useSelector((state: RootState) => state.player);

    const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
    const lastIpcTimeRef = useRef<number>(0);
    const lastIpcTimestampRef = useRef<number>(0);
    const rafRef = useRef<number | null>(null);
    const playbackRunningRef = useRef(playbackRunning);

    useEffect(() => {
        const unsub = window.api.onLoadingProgress((progress) => {
            loadingProgressRef.current = progress;
        });
        return () => {
            unsub();
        };
    }, []);

    useEffect(() => {
        playbackRunningRef.current = playbackRunning;
    }, [playbackRunning]);

    useEffect(() => {
        let targetDisplay: SeekBarDisplayStyle = wantedDisplayStyle;
        if (sourceType === "remote") targetDisplay = SeekBarDisplayStyle.DEFAULT;

        setDisplayStyle(targetDisplay);
    }, [sourceType, peaks]);

    useEffect(() => {
        if (!canvasRef.current || displayStyle !== SeekBarDisplayStyle.WAVEFORM) return;
        const offscreen = document.createElement("canvas");
        offscreen.width = seekbarWidth;
        offscreen.height = seekbarHeight;
        const ctx = offscreen.getContext("2d");
        if (!ctx) return;

        drawWaveform(ctx, peaks, offscreen.width, offscreen.height);

        offscreenCanvasRef.current = offscreen;
    }, [peaks, displayStyle]);

    const drawWaveform = (ctx: CanvasRenderingContext2D, peaks: number[], width: number, height: number) => {
        ctx.clearRect(0, 0, width, height);

        const middle = height / 2;
        const barWidth = width / peaks.length;
        const minHeightFraction = 0.08;
        ctx.fillStyle = "rgb(255,255,255)";
        if (peaks.length === 0) ctx.fillRect(0, middle - minHeightFraction * height / 2, width, minHeightFraction * height);

        for (let i = 0; i < peaks.length; i++) {
            let value = peaks[i];
            value = Math.max(value, minHeightFraction);
            const barHeight = value * height;
            const x = i * barWidth;
            ctx.fillRect(x, middle - barHeight / 2, barWidth, barHeight);
        }
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

    useEffect(() => {
        lastIpcTimeRef.current = currentTime;
        lastIpcTimestampRef.current = performance.now();
    }, [currentTime, playbackRunning]);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        const loop = () => {
            const now = performance.now();
            const elapsed = (now - lastIpcTimestampRef.current) / 1000;
            let interpolatedTime = lastIpcTimeRef.current + elapsed;
            if (interpolatedTime > duration) interpolatedTime = duration;
            if (interpolatedTime < 0) interpolatedTime = 0;

            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            if (offscreenCanvasRef.current) {
                ctx.drawImage(offscreenCanvasRef.current, 0, 0);
            }

            let progressTime: number;
            if (dragTimeRef.current !== null) {
                progressTime = dragTimeRef.current;
            } else if (lastSeekRef.current !== null) {
                const diff = Math.abs(lastIpcTimeRef.current - lastSeekRef.current);
                if (diff > 0.05) {
                    progressTime = lastSeekRef.current;
                } else {
                    lastSeekRef.current = null;
                    progressTime = playbackRunningRef.current
                        ? interpolatedTime
                        : lastIpcTimeRef.current;
                }
            } else {
                progressTime = playbackRunningRef.current ? interpolatedTime : lastIpcTimeRef.current;
            }

            const progressX = progressTime / duration * ctx.canvas.width;
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(progressX, 0, ctx.canvas.width - progressX, ctx.canvas.height);

            //ctx.fillStyle = "rgba(90,255,90,0.3)";
            //ctx.fillRect(0, 0, loadingProgressRef.current * ctx.canvas.width, ctx.canvas.height);

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [duration]);

    const updateHover = (clientX: number, dragging: boolean) => {
        if (!barRef.current || duration <= 0) return;
        const rect = barRef.current.getBoundingClientRect();
        const relativeX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
        const percent = relativeX / rect.width;
        const newTime = percent * duration;
        hoverTimeRef.current = newTime;
        setHoverX(relativeX);

        if (dragging) dragTimeRef.current = newTime - latency;
    };

    const handleMouseDown = (e: MouseEvent) => {
        updateHover(e.clientX, true);

        const handleMove = (e: globalThis.MouseEvent) => updateHover(e.clientX, true);
        const handleUp = () => {
            if (hoverTimeRef.current !== null) {
                window.api.seek(hoverTimeRef.current);
                lastSeekRef.current = dragTimeRef.current;
            }
            dragTimeRef.current = null;


            document.removeEventListener("mousemove", handleMove);
            document.removeEventListener("mouseup", handleUp);
        };

        document.addEventListener("mousemove", handleMove);
        document.addEventListener("mouseup", handleUp);
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => {
        setIsHovering(false);
        hoverTimeRef.current = null;
    };

    return (
        <div
            style={{width: seekbarWidth, padding: displayStyle === SeekBarDisplayStyle.WAVEFORM ? 0 : "10px 0"}}
            className={s.seekBar}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseMove={(e) => {
                updateHover(e.clientX, false);
            }}
            ref={barRef}>
            <div className={s.barWrapper} style={{height: seekbarHeight + "px"}}>
                <canvas className={s.canvas} ref={canvasRef} width={seekbarWidth} height={seekbarHeight + "px"}
                        style={displayStyle === SeekBarDisplayStyle.WAVEFORM ? {backgroundColor: "transparent"} : {borderRadius: "2px"}}/>
                {(isHovering || dragTimeRef.current) && hoverTimeRef.current !== null && (
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
