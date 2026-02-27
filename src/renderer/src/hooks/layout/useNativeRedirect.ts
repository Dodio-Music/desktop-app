import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useNativeRedirect() {
    const navigate = useNavigate();

    useEffect(() => {
        const off = window.api.onNavigate((url) => {
            navigate(url);
        });

        return () => {
            off();
        }
    }, [navigate]);
}
