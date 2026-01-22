import axios, {AxiosError, AxiosInstance, AxiosResponse} from "axios";
import {ApiResult, AxiosMethodArgs, DodioApi, DodioError, MayError, NoLoginError} from "../../shared/Api.js";
import {auth, updateAuth} from "../auth.js";
import {IRole} from "./Typing.js";

let instance: AxiosInstance = null!;

export function setupApi() {
    console.log("Creating axios connection to backend: ", process.env.DODIO_BACKEND_URL);

    instance = axios.create({
        baseURL: process.env.DODIO_BACKEND_URL,
        timeout: 10000
    });

    // get refresh token if access token expired
    instance.interceptors.request.use(async (config) => {
        if (config.url?.includes("/auth/refresh")) return config;
        if (!auth?.access_token) return config;

        if (auth.access_token_expiry && auth.access_token_expiry.getTime() < Date.now()) {
            if (!isRefreshing) {
                isRefreshing = true;
                const refreshErr = await refreshAuthToken();
                isRefreshing = false;
                refreshQueue.forEach((cb) => cb());
                refreshQueue = [];

                if (refreshErr) {
                    updateAuth({
                        access_token: undefined,
                        access_token_expiry: undefined
                    });
                    return Promise.reject(refreshErr);
                }
            } else {
                await new Promise<void>((resolve) => refreshQueue.push(resolve));
            }
        }

        config.headers.Authorization = `Bearer ${auth.access_token}`;
        return config;
    });

    // retry request if failed (server-side fail)
    instance.interceptors.response.use(
        res => res,
        async (err) => {
            const originalRequest = err.config;

            if (err.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                const refreshErr = await refreshAuthToken();
                if (refreshErr) return Promise.reject(err);

                originalRequest.headers.Authorization = `Bearer ${auth?.access_token}`;
                return instance(originalRequest);
            }

            return Promise.reject(err);
        }
    );
}

function handleError(err: unknown): DodioError {
    if (err instanceof AxiosError) {
        if (err.code === "ECONNREFUSED") return {error: "no-connection"} as DodioError;

        if (err.response) {
            if(err.response.status === 401) return {error: "no-login"} as DodioError;

            return err.response.data as DodioError;
        }
    }
    console.error("Request Error: ", err, typeof err);
    return {error: "info", arg: {message: "An unknown error occured!"}};
}

export async function refreshAuthToken(): Promise<MayError> {
    if (!auth?.refresh_token || !auth.refresh_token_expiry || isNaN(auth.refresh_token_expiry.getTime())) {
        return NoLoginError;
    }
    if (auth.refresh_token_expiry.getTime() < Date.now()) {
        updateAuth({
            refresh_token_expiry: undefined,
            refresh_token: undefined,
            access_token: undefined,
            access_token_expiry: undefined
        });
        return NoLoginError;
    }

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
    } catch (err) {
        const dodioErr = handleError(err);
        if(dodioErr.error === "no-login") {
            updateAuth({
                access_token: undefined,
                access_token_expiry: undefined,
                refresh_token: undefined,
                refresh_token_expiry: undefined
            });
        } else {
            updateAuth({});
        }
        return dodioErr;
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
    role: IRole
}

interface RefreshTokenResponse {
    accessToken: string,
    accessTokenExpirationDate: string,
}

let isRefreshing = false;
let refreshQueue: (() => void)[] = [];


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
                refresh_token_expiry: new Date(res.data.refreshTokenExpirationDate),
                role: res.data.role
            });
            return null;
        } catch (e) {
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
            const res = await instance.post("auth/signup", {
                username,
                email,
                password
            });
            return res.data;
        } catch (e) {
            return handleError(e);
        }
    },
    async authRequest<M extends keyof AxiosMethodArgs, T = unknown>(method: M, ...args: AxiosMethodArgs[M]): Promise<ApiResult<T>> {
        try {
            const result = await (instance[method] as (...p: AxiosMethodArgs[M]) => Promise<AxiosResponse<T>>)(...args);
            return {type: "ok", value: result.data};
        } catch (e) {
            return { type: "error", error: handleError(e) };
        }
    }
} as const satisfies DodioApi;
