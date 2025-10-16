import axios, {AxiosError, AxiosInstance, AxiosResponse} from "axios";
import {DodioApi, RequestMethods} from "../../shared/Api.js";
import {auth, updateAuth} from "../auth.js";

const instance = axios.create({
    baseURL: "http://localhost:8085/dodio"
});

function logError(e: unknown) {
    if(e instanceof AxiosError) {
        console.error("Request Error:", e.message,"->", e.response?.data);
    }else console.error("Request Error: ", e);
}

async function create_auth_instance() {
    let token: string | undefined;
    if(
        !auth
        || !auth.access_token_expiry
        || !auth.access_token
    || auth.access_token_expiry.getTime() < Date.now()) {
        if(!await refresh()) {
            updateAuth({
                access_token: undefined,
                access_token_expiry: undefined,
            });
            return;
        }
        token = auth?.refresh_token
    }else {
        token = auth.refresh_token;
    }

    if(!token) return;
    return instance.create({
        params: {token: token}
    })
}

async function refresh() {
    if(!auth?.refresh_token_expiry || !auth?.refresh_token_expiry) return false;
    if(auth.refresh_token_expiry.getTime() < Date.now()) {
        updateAuth({
            refresh_token_expiry: undefined,
            refresh_token: undefined,
        });
        return false;
    }

    try {
        const res =
            await instance.post<RefreshTokenResponse>("/auth/refresh", {
                refreshToken: auth?.refresh_token
            });
        updateAuth({
            access_token: res.data.accessToken,
            access_token_expiry: new Date(res.data.accessTokenExpiration)
        });
        return true;
    }catch (e) {
        logError(e);
        return false;
    }
}

let auth_instance: AxiosInstance | undefined;

export async function setupApi() {
    auth_instance = await create_auth_instance();
}

interface SignInResponse {
    id: number,
    type: string,
    username: string,
    accessToken: string,
    accessTokenExpiration: string,
    refreshToken: string,
    refreshTokenExpiration: string,
}

interface RefreshTokenResponse {
    accessToken: string,
    accessTokenExpiration: string,
}



export default {
    async login(login: string, password: string) {
        try {
            const res = await instance.post<SignInResponse>("/auth/signin", {
                login,
                password
            });
            updateAuth({
                hasAccount: true,
                access_token: res.data.accessToken,
                refresh_token: res.data.refreshToken,
                access_token_expiry: new Date(res.data.accessTokenExpiration),
                refresh_token_expiry: new Date(res.data.refreshTokenExpiration)
            })
            return true;
        }catch (e) {
            logError(e);
            return false;
        }
    },
    logout() {
        updateAuth({
            refresh_token: undefined,
            refresh_token_expiry: undefined,
            access_token_expiry: undefined,
            access_token: undefined,
            hasAccount: true
        });
        return true;
    },
    refresh,
    async signup(username: string, email: string, password: string) {
        try {
            await instance.post("auth/signup", {
                username,
                email,
                password
            })
            return true;
        }catch (e) {
            logError(e);
            return false;
        }
    },
    defaultAccountPage() {
        if(auth?.access_token || auth?.refresh_token) return "account";
        if(auth?.hasAccount) return "login";
        return "signup";
    },
    async authRequest<M extends RequestMethods, T = unknown>(method: M, ...args: Parameters<AxiosInstance[M]>): Promise<AxiosResponse<T>|undefined> {
        if (!auth_instance) return;

        for(;;) {
            try {
                //@ts-expect-error spread args are annoying
                return auth_instance[method]<T>(...args) as unknown as Promise<AxiosResponse<T>>;
            } catch (e) {
                if (e instanceof AxiosError
                    && e.status === 401
                    && await refresh()) continue
                logError(e);
                return;
            }
        }
    }
} as const satisfies DodioApi;
