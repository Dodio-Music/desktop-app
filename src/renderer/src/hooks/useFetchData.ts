import { useState, useEffect, useCallback } from "react";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {DodioError} from "../../../shared/Api";

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
                setError(mapError(res.error));
            }
        } catch (e) {
            console.error("Fetch failed:", e);
            setError("An unknown error occurred!");
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        if (authStatus !== "account") {
            setLoading(false);
            return;
        }

        void fetchData();

    }, [authStatus, fetchData]);

    return { data, loading, error, refetch: fetchData };
}

const mapError = (err: DodioError) => {
    switch (err.error) {
        case "Not Found": return "Endpoint not found. (404)";
        case "no-login": return "Not logged in!";
        case "info": return err.arg.message ?? "Info error";
        case "no-connection": return "Request timed out, please try again later!";
        default: return "An unknown error occurred!";
    }
};
