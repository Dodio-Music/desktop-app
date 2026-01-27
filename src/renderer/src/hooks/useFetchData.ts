import { useState, useEffect, useCallback } from "react";
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

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData(null);
            const res = await window.api.authRequest<T>("get", url);
            if (res.type === "ok") {
                setData(res.value);
            } else {
                console.log(res.error);
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

        void fetchData();

    }, [authInfo, fetchData]);

    return { data, loading, error, refetch: fetchData };
}
