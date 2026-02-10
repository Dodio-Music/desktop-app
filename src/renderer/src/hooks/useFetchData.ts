import {useState, useEffect, useCallback, useRef} from "react";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {errorToString} from "@renderer/util/errorToString";

type FetchState<T> = {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
};

export default function useFetchData<T>(url: string): FetchState<T> {
    const {info: authInfo} = useAuth();
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hasFetchedRef = useRef(false);

    const fetchData = useCallback(async (resetOnFetch: boolean = true) => {
        setLoading(true);
        setError(null);
        try {
            if(resetOnFetch) setData(null);
            const res = await window.api.authRequest<T>("get", url);
            if (res.type === "ok") {
                setData(res.value);
            } else {
                setError(errorToString(res.error));
            }
        } catch (e) {
            console.error("Fetch failed:", e);
            setError("An unknown error occurred!");
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        if (authInfo.status !== "account") {
            setLoading(false);
            return;
        }

        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        void fetchData();
    }, [authInfo, fetchData]);

    return { data, loading, error, refetch: () => fetchData(false) };
}
