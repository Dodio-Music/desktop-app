import {AxiosInstance, AxiosResponse} from "axios";

export type RequestMethods = "get" | "post" | "put" | "patch" | "delete";
export type AuthStatus = "login" | "signup" | "account";

export interface DodioApi {
    login(login: string, password: string): Promise<MayError>;
    signup(username: string, email: string, password: string): Promise<MayError>;
    logout(): Promise<MayError>;
    authRequest<M extends RequestMethods, T = unknown>(method: M, ...args: Parameters<AxiosInstance[M]>): Promise<ApiResult<AxiosResponse<T>>>,
}
export type InvalidInputKeys = "username" | "email" | "login" | "password";
export const NoLoginError = {error: "no-login"} satisfies DodioError;
export type DodioError = {
    error: "no-login",
    arg?: undefined
} | {
    error: "invalid-input",
    arg: {
        inputKey: InvalidInputKeys,
        message: string,
    }
} | {
    error: "info",
    arg: {message: string}
} | {
    error: "no-connection",
    arg?: undefined
} | {
    error: "multiple",
    arg: {
       errors: DodioError[]
    }
}

export type MayError = DodioError | null;

export type ApiResult<T> = ({type:"error", error: DodioError }) | {type: "ok", value: T};
