import "./assets/base.css";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import Titlebar from "./layout/Titlebar/Titlebar";
import Sidebar from "./layout/Sidebar/Sidebar";
import ViewBrowser from "./layout/ViewBrowser/ViewBrowser";
import PlaybackBar from "./components/PlaybackBar/PlaybackBar";
import s from "./App.module.css";

function App(): React.JSX.Element {
    const [zoomLevel, setZoomLevel] = useState(1);
    const navigate = useNavigate();
    const alreadySetup = useRef(false);

    const onWheel = useCallback((e: WheelEvent) => {
        const isZoomModifier =
            (navigator.platform.includes("Mac") ? e.metaKey : e.ctrlKey) || e.ctrlKey;
        if (!isZoomModifier) return;

        e.preventDefault();
        if (e.deltaY < 0) {
            window.api.zoomIn();
        } else {
            window.api.zoomOut();
        }
    }, []);

    const handleMouse = useCallback((e: KeyboardEvent) => {
        if (e.altKey && e.key === "ArrowLeft") navigate(-1)
        if (e.altKey && e.key === "ArrowRight") navigate(1);
    }, [navigate]);

    useEffect(() => {
        const unsubscribe = window.api.onZoomFactorChanged((factor) => {
            setZoomLevel(factor);
        });

        window.addEventListener("keydown", handleMouse);

        if(alreadySetup.current) return;
        alreadySetup.current = true;

        window.addEventListener("wheel", onWheel, { passive: false });

        return () => {
            unsubscribe();
            window.removeEventListener("keydown", handleMouse);
        }
    }, [handleMouse, navigate, onWheel]);

    return (
        <>
            <div className={s.appContainer}>
                <Titlebar/>
                <div className={s.displayContainer}>
                    <div className={s.zoomContainer}><p className={s.zoomLevel}>{Math.round(zoomLevel * 100)}%</p></div>
                    <div className={s.mainContainer}>
                        <Sidebar/>
                        <ViewBrowser/>
                        <div className={s.songInfo}></div>
                    </div>
                    <PlaybackBar/>
                </div>
            </div>
        </>
    );
}

export default App;
