import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export function useNavigationShortcuts() {
    const navigate = useNavigate();

    const handleKey = useCallback((e: KeyboardEvent) => {
        if (e.altKey && e.key === "ArrowLeft") navigate(-1);
        if (e.altKey && e.key === "ArrowRight") navigate(1);
    }, [navigate]);

    useEffect(() => {
        window.addEventListener("keydown", handleKey);
        return () => {
            window.removeEventListener("keydown", handleKey);
        };
    }, [handleKey]);
}
