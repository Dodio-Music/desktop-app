import {useState, useEffect, useCallback, useRef} from "react";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {errorToString} from "@renderer/util/errorToString";

type FetchState<T> = {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
};

export default function useFetchData<T>(url: string, resetOnFetch: boolean = true): FetchState<T> {
    const {info: authInfo} = useAuth();
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const lastFetchedUrlRef = useRef<string | null>(null);

    const fetchData = useCallback(async (resetOnFetch: boolean = true) => {
        if (!url) return

        setLoading(true);
        setError(null);
        try {
            if(resetOnFetch) setData(null);
            const res = await window.api.authRequest<T>("get", url);
            if (res.type === "ok") {
                console.log(data)
                setData(res.value);
            } else {
                console.log("debuggign")
                console.log(res.error)
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
        if (!url) return

        if (authInfo.status === "no_account") {
            setLoading(false);
            return;
        }

        if (lastFetchedUrlRef.current === url) return;
        lastFetchedUrlRef.current = url;

        void fetchData(resetOnFetch);
    }, [authInfo, fetchData, url, resetOnFetch]);

    return { data, loading, error, refetch: () => fetchData(false) };
}
