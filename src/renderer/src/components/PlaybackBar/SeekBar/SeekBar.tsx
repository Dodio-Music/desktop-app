import s from "../PlaybackBar.module.css";
import {useEffect, useRef} from "react";

interface SeekBarProps {
    waveformData: number[];
}

const SeekBar = ({waveformData} : SeekBarProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
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
    }, [waveformData]);

    return (
        <div className={s.seekBar}>
            <canvas className={s.canvas}/>
            <div className={s.coverUp}/>
        </div>
    );
};

export default SeekBar;
