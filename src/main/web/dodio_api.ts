import axios, {AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse} from "axios";
import {ApiResult, DodioApi, DodioError, MayError, NoLoginError, RequestMethods} from "../../shared/Api.js";
import {auth, updateAuth} from "../auth.js";

const instance = axios.create({
    baseURL: "http://localhost:8085/dodio"
});

function handleError(err: unknown): DodioError {
    if(err instanceof AxiosError) {
        if(err.code === "ECONNREFUSED") return {error: "no-connection"} as DodioError;
        if(err.response) return err.response.data as DodioError;
    }else console.error("Request Error: ", err, typeof err);
    return {error: "info", arg: {message: "An unknown error occured!"}};
}

export async function refreshAuthToken(): Promise<MayError> {
    if(!auth?.refresh_token_expiry || !auth?.refresh_token_expiry) return NoLoginError;
    if(auth.refresh_token_expiry.getTime() < Date.now()) {
        updateAuth({
            refresh_token_expiry: undefined,
            refresh_token: undefined,
        });
        return NoLoginError;
    }

    // console.log("auth")
    // console.log(auth);

    try {
        const res =
            await instance.post<RefreshTokenResponse>("/auth/refresh", {
                refreshToken: auth?.refresh_token
            });
        updateAuth({
            access_token: res.data.accessToken,
            access_token_expiry: new Date(res.data.accessTokenExpirationDate)
        });
        return null;
    }catch (e) {
        return handleError(e);
    }
}


interface SignInResponse {
    id: number,
    type: string,
    username: string,
    accessToken: string,
    accessTokenExpirationDate: string,
    refreshToken: string,
    refreshTokenExpirationDate: string,
}

interface RefreshTokenResponse {
    accessToken: string,
    accessTokenExpirationDate: string,
}

export default {
    async login(login: string, password: string): Promise<MayError> {
        try {
            const res = await instance.post<SignInResponse>("/auth/signin", {
                login,
                password
            });
            updateAuth({
                hasAccount: true,
                access_token: res.data.accessToken,
                refresh_token: res.data.refreshToken,
                access_token_expiry: new Date(res.data.accessTokenExpirationDate),
                refresh_token_expiry: new Date(res.data.refreshTokenExpirationDate)
            })
            return null;
        }catch (e) {
            return handleError(e);
        }
    },
    async logout(): Promise<MayError> {
        updateAuth({
            refresh_token: undefined,
            refresh_token_expiry: undefined,
            access_token_expiry: undefined,
            access_token: undefined,
            hasAccount: true
        });
        return null;
    },
    async signup(username: string, email: string, password: string) {
        try {
            await instance.post("auth/signup", {
                username,
                email,
                password
            })
            return null;
        }catch (e) {
            return handleError(e);
        }
    },
    async authRequest<M extends RequestMethods, T = unknown>(method: M, ...args: Parameters<AxiosInstance[M]>): Promise<ApiResult<AxiosResponse<T>>> {
        if (!instance) return {type: "error", error: NoLoginError};
        if(!auth?.access_token) {
            console.log("nop");
            return {type: "error", error: NoLoginError};
        }

        let token: string | undefined;

        if(
            !auth
            || !auth.access_token_expiry
            || !auth.access_token
            || auth.access_token_expiry.getTime() < Date.now()) {
            if(!await refreshAuthToken()) {
                updateAuth({
                    access_token: undefined,
                    access_token_expiry: undefined,
                });
                return {type :"error", error: NoLoginError}
            }
            token = auth?.refresh_token
        }else {
            token = auth.refresh_token;
        }

        if(!token) return {type :"error", error: NoLoginError};

        if(method === "get" || method === "delete") {
            const config = args[1] as AxiosRequestConfig<unknown> | undefined ?? {};
            config.params ??= {};
            config.params.token = auth.access_token;
            args[1] = config;
        }else {
            const config = args[2] as AxiosRequestConfig<unknown> | undefined ?? {};
            config.params ??= {};
            config.params.token = auth.access_token;
            args[2] = config;
        }

        for(let i = 0; i < 5; i++) {
            try {
                //@ts-expect-error spread args are annoying
                const result = (await instance[method]<T>(...args)) as AxiosResponse<T>;
                return {type: "ok", value: result};
            } catch (e) {
                if (e instanceof AxiosError
                    && e.status === 401) {
                    const refreshError = await refreshAuthToken();
                    if(!refreshError) continue;
                    return {type: "error", error: refreshError};
                }
                return {type: "error", error: handleError(e)};
            }
        }
        return {type: "error", error: NoLoginError};
    }
} as const satisfies DodioApi;
