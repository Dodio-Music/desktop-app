import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import {RootState} from "@renderer/redux/store";

type FetchState<T> = {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
};

export default function useFetchData<T>(url: string): FetchState<T> {
    const authStatus = useSelector((s: RootState) => s.auth.status);
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
                    setError("no-login");
                } else {
                    setError("error");
                }
            }
        } catch (e) {
            console.error("Fetch failed:", e);
            setError("error");
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
