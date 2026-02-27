import axios, {AxiosError, AxiosInstance, AxiosResponse} from "axios";
import {ApiResult, AxiosMethodArgs, DodioApi, DodioError, MayError, NoLoginError} from "../../shared/Api.js";
import {applyLogin, applyRefresh, auth, clearAuth, removeAccessToken} from "../auth.js";
import {RefreshTokenResponse, SignInResponse} from "./Typing.js";

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
        if (!auth?.accessToken) return config;

        if (auth.accessTokenExpirationDate && auth.accessTokenExpirationDate.getTime() < Date.now()) {
            if (!isRefreshing) {
                isRefreshing = true;
                const refreshErr = await refreshAuthToken();
                isRefreshing = false;
                refreshQueue.forEach((cb) => cb());
                refreshQueue = [];

                if (refreshErr) {
                    removeAccessToken();
                    return Promise.reject(refreshErr);
                }
            } else {
                await new Promise<void>((resolve) => refreshQueue.push(resolve));
            }
        }

        config.headers.Authorization = `Bearer ${auth.accessToken}`;
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

                originalRequest.headers.Authorization = `Bearer ${auth?.accessToken}`;
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
            if (err.response.status === 401) return {error: "no-login"} as DodioError;

            return err.response.data as DodioError;
        }
    }
    console.error("Request Error: ", err, typeof err);
    return {error: "info", arg: {message: "An unknown error occured!"}};
}

export async function refreshAuthToken(): Promise<MayError> {
    if (!auth?.refreshToken || !auth.refreshTokenExpirationDate || isNaN(auth.refreshTokenExpirationDate.getTime())) {
        return NoLoginError;
    }
    if (auth.refreshTokenExpirationDate.getTime() < Date.now()) {
        clearAuth();
        return NoLoginError;
    }

    try {
        const res =
            await instance.post<RefreshTokenResponse>("/auth/refresh", {
                refreshToken: auth?.refreshToken
            });
        applyRefresh(res.data);
        return null;
    } catch (err) {
        const dodioErr = handleError(err);
        if (dodioErr.error === "no-login") {
            clearAuth();
        }
        return dodioErr;
    }
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
            applyLogin(res.data);
            return null;
        } catch (e) {
            return handleError(e);
        }
    },
    async logout(): Promise<MayError> {
        clearAuth();
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
    async authRequest<
        T = unknown,
        M extends keyof AxiosMethodArgs = keyof AxiosMethodArgs
    >(
        method: M,
        ...args: AxiosMethodArgs[M]
    ): Promise<ApiResult<T>> {
        try {
            const result = await (instance[method] as (...p: AxiosMethodArgs[M]) => Promise<AxiosResponse<T>>)(...args);
            return {type: "ok", value: result.data};
        } catch (e) {
            return {type: "error", error: handleError(e)};
        }
    },
    async plainRequest<
        T = unknown,
        M extends keyof AxiosMethodArgs = keyof AxiosMethodArgs
    >(
        method: M,
        ...args: AxiosMethodArgs[M]
    ): Promise<ApiResult<T>> {
        const tempInstance = axios.create({
            baseURL: instance.defaults.baseURL,
            headers: instance.defaults.headers,
        });

        try {
            const result = await (tempInstance[method] as (...p: AxiosMethodArgs[M]) => Promise<AxiosResponse<T>>)(...args);
            return { type: "ok", value: result.data };
        } catch (e) {
            return { type: "error", error: handleError(e) };
        }
    }
} as const satisfies DodioApi;
