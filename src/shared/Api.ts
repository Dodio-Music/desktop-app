import {AxiosInstance, AxiosResponse} from "axios";

export type AxiosMethodArgs = {
    get: Parameters<AxiosInstance["get"]>;
    delete: Parameters<AxiosInstance["delete"]>;
    head: Parameters<AxiosInstance["head"]>;
    options: Parameters<AxiosInstance["options"]>;
    post: Parameters<AxiosInstance["post"]>;
    put: Parameters<AxiosInstance["put"]>;
    patch: Parameters<AxiosInstance["patch"]>;
};
export type AuthStatus = "login" | "signup" | "account";

export interface DodioApi {
    login(login: string, password: string): Promise<MayError>;
    signup(username: string, email: string, password: string): Promise<MayError>;
    logout(): Promise<MayError>;
    authRequest<M extends keyof AxiosMethodArgs, T = unknown>(method: M, ...args: AxiosMethodArgs[M]): Promise<ApiResult<AxiosResponse<T>>>,
}
export type InvalidInputKeys = "username" | "email" | "login" | "password" | "password-reset-token";
export const NoLoginError = {error: "no-login"} satisfies DodioError;
export type DodioError = {
    error: "Not Found"
} | {
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

export type SourceQuality = "LOSSLESS" | "HIGH" | "LOW";

export interface TrackDTO {
    trackId: string;
    title: string;
    views: number;
    duration: number;
    artists: string[];
    sources: SourceDTO[];
    waveformUrl: string;
}

export interface ReleaseTrackDTO {
    releaseTrackId: string;
    track: TrackDTO;
}

export interface ReleaseDTO {
    releaseId: string;
    releaseName: string;
    coverArtUrl: string;
    releaseDate: string;
    artists: string[];
    releaseType: string;
    releaseTracks: ReleaseTrackDTO[];
}

export interface SourceDTO {
    sourceId: string;
    url: string;
    quality: SourceQuality
}
