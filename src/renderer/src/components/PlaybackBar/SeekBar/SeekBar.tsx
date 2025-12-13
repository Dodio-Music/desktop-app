import s from "../PlaybackBar.module.css";
import {MouseEvent, useEffect, useRef, useState} from "react";
import {formatTime} from "../../../util/timeUtils";
import {shallowEqual, useSelector} from "react-redux";
import {RootState} from "../../../redux/store";
import {isRemoteSong, SEGMENT_DURATION} from "../../../../../shared/TrackInfo";
import {useWaveform} from "@renderer/components/PlaybackBar/SeekBar/useWaveform";
import {WaveformData} from "../../../../../shared/PlayerState";

enum SeekBarDisplayStyle {
    DEFAULT, WAVEFORM
}

const wantedDisplayStyle = SeekBarDisplayStyle.WAVEFORM;
const seekbarWidth = 600;
const showLoadingProcess = false;

const SeekBar = () => {
    const latency = useSelector((state: RootState) => state.nativePlayer.latency);
    const duration = useSelector((state: RootState) => state.nativePlayer.duration);
    const currentTime = useSelector((state: RootState) => state.nativePlayer.currentTime);
    const playbackRunning = useSelector((state: RootState) => state.nativePlayer.playbackRunning);
    const currentTrack = useSelector((state: RootState) => state.nativePlayer.currentTrack, shallowEqual);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const durationRef = useRef<number>(duration);
    const [waveformData, setWaveformData] = useState<WaveformData>();
    const [hoverX, setHoverX] = useState<number>(0);
    const loadingProgressRef = useRef<number[]>([]);
    const [isHovering, setIsHovering] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);
    const hoverTimeRef = useRef<number | null>(null);
    const dragTimeRef = useRef<number | null>(null);
    const lastSeekRef = useRef<number | null>(null);

    const displayStyle = currentTrack && (isRemoteSong(currentTrack) && currentTrack.waveformUrl === null)
        ? SeekBarDisplayStyle.DEFAULT
        : wantedDisplayStyle;
    const seekbarHeight = displayStyle === SeekBarDisplayStyle.WAVEFORM ? 25 : 5;

    const waveformRef = useWaveform(waveformData, seekbarWidth, seekbarHeight, currentTrack?.id ?? null);
    const lastIpcTimeRef = useRef<number>(0);
    const lastIpcTimestampRef = useRef<number>(0);
    const rafRef = useRef<number | null>(null);
    const playbackRunningRef = useRef(playbackRunning);

    useEffect(() => {
        playbackRunningRef.current = playbackRunning;
    }, [playbackRunning]);

    useEffect(() => {
        durationRef.current = duration;
    }, [duration]);

    useEffect(() => {
        const unsub = window.api.onPlayerEvent((event) => {
            switch (event.type) {
                case "loading-progress":
                    loadingProgressRef.current = event.progress;
                    break;
                case "waveform-data":
                    setWaveformData(event);
                    break;
                case "media-transition":
                    setWaveformData(event.waveformData);
                    loadingProgressRef.current = [];
                    break;
            }
        });

        return () => {
            unsub();
        };
    }, []);

    useEffect(() => {
        lastIpcTimeRef.current = currentTime;
        lastIpcTimestampRef.current = performance.now();
    }, [currentTime, playbackRunning]);

    function getInterpolatedTime() {
        const now = performance.now();
        const elapsed = (now - lastIpcTimestampRef.current) / 1000;
        const t = lastIpcTimeRef.current + elapsed;
        const dur = durationRef.current;
        return Math.min(Math.max(t, 0), dur);
    }

    useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        const loop = () => {
            const interpolatedTime = getInterpolatedTime();

            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            const progressColor = "rgb(90,189,255)";

            ctx.drawImage(waveformRef.current, 0, 0);

            ctx.save();
            const segments = loadingProgressRef.current;

            if (segments.length > 0 && showLoadingProcess) {
                ctx.beginPath();

                for (let i = 0; i < segments.length; i++) {
                    if (segments[i] === 1) {
                        const startTime = i * SEGMENT_DURATION;
                        const endTime = (i + 1) * SEGMENT_DURATION;
                        const segmentWidth = ((endTime - startTime) / durationRef.current) * ctx.canvas.width;

                        const x = (startTime / durationRef.current) * ctx.canvas.width;
                        ctx.rect(x, 0, segmentWidth, ctx.canvas.height);
                    }
                }
                ctx.clip();

                ctx.globalCompositeOperation = displayStyle === SeekBarDisplayStyle.WAVEFORM ? "source-in" : "source-over";
                ctx.fillStyle = progressColor;
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }
            ctx.restore();
            ctx.globalCompositeOperation = "source-over";

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

            const progressX = progressTime / durationRef.current * ctx.canvas.width;
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(progressX, 0, ctx.canvas.width - progressX, ctx.canvas.height);

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [displayStyle, waveformRef]);

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
        <div className={s.row} id={s.middleRow}>
            <p className={s.time}>{formatTime(Math.max(currentTime, 0))}</p>
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
            <p className={s.time}>{formatTime(duration)}</p>
        </div>
    );
};

export default SeekBar;
