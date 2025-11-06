import React, {useMemo} from "react";
import useAwait from "@renderer/hooks/useSafeAwait";
import useErrorHandling from "@renderer/hooks/useErrorHandling";
import ErrorPage from "@renderer/pages/ErrorPage";
import LoadingPage from "@renderer/pages/LoadingPage";
import LoginPage from "@renderer/pages/account/LoginPage";

type Result<T> = {
    data: T,
    ControlPage: null
} | {
    data: null;
    ControlPage: React.FC
}

const useAuthPage = <T>(url: string): Result<T> => {
    const rq = useMemo(() => () => window.api.authRequest<"get",T>("get", url), [url]);
    const responseResult = useAwait(rq, null);
    const {setError}  = useErrorHandling();
    return useMemo(() => {
        if(responseResult === null) return {ControlPage: LoadingPage, data: null};
        if(responseResult.type === "ok") return {data: responseResult.value.data, ControlPage: null};
        setError(responseResult.error);
        if(responseResult.error?.error === "no-login") return {ControlPage: LoginPage, data: null};
        return {ControlPage: ErrorPage, data: null};
    }, [responseResult, setError]);

};

export default useAuthPage;
