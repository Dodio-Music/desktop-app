import { useState, useEffect, useCallback } from "react";
import {useAuth} from "@renderer/hooks/reduxHooks";

type FetchState<T> = {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
};

export default function useFetchData<T>(url: string): FetchState<T> {
    const {status: authStatus} = useAuth();
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await window.api.authRequest<"get", T>("get", url);
            if (res.type === "ok") {
                setData(res.value);
            } else {
                if (res.error?.error === "no-login") {
                    setError("Not logged in!");
                } else if(res.error.error === "info") {
                    setError(res.error.arg.message);
                } else if(res.error.error === "no-connection") {
                    setError("Request timed out, please try again later!");
                } else {
                    setError("An Unknown error occurred!");
                }
            }
        } catch (e) {
            console.error("Fetch failed:", e);
            setError("An unknown error occurred!");
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        if (authStatus === "account") void fetchData();
        else setLoading(false);
    }, [authStatus, fetchData]);

    return { data, loading, error, refetch: fetchData };
}
