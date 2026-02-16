import { useEffect, useState, useCallback, useRef } from "react";

export function useZoom() {
    const [zoomFactor, setzoomFactor] = useState(1);
    const alreadySetup = useRef(false);

    useEffect(() => {
        const fetchZoom = async () => {
            const factor = await window.api.getZoom();
            setzoomFactor(factor);
        };
        void fetchZoom();
    }, []);

    const onWheel = useCallback((e: WheelEvent) => {
        const isZoomModifier = (navigator.platform.includes("Mac") ? e.metaKey : e.ctrlKey) || e.ctrlKey;
        if (!isZoomModifier) return;

        e.preventDefault();
        if (e.deltaY < 0) window.api.zoomIn();
        else window.api.zoomOut();
    }, []);

    const handleZoomShortcuts = useCallback((e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === "0") {
            e.preventDefault();
            window.api.resetZoom();
        }
        if(e.ctrlKey && e.shiftKey && e.key === "*") {
            e.preventDefault();
            window.api.zoomIn();
        }
        if(e.ctrlKey && e.key === "-") {
            e.preventDefault();
            window.api.zoomOut();
        }
    }, []);

    useEffect(() => {
        const unsubscribe = window.api.onZoomFactorChanged((factor) => {
            setzoomFactor(factor);
        });

        if (!alreadySetup.current) {
            alreadySetup.current = true;
            window.addEventListener("wheel", onWheel, { passive: false });
            window.addEventListener("keydown", handleZoomShortcuts);
        }

        return () => {
            unsubscribe();
            window.removeEventListener("wheel", onWheel);
            window.removeEventListener("keydown", handleZoomShortcuts);
        };
    }, [onWheel, handleZoomShortcuts]);

    return zoomFactor;
}
