export interface SignInResponse {
    username: string;
    displayName: string;
    email: string;
    role: IRole;
    refreshToken: string;
    refreshTokenExpirationDate: string;
    accessToken: string;
    accessTokenExpirationDate: string;
}

export interface RefreshTokenResponse {
    accessToken: string;
    accessTokenExpirationDate: string;
    username: string;
    displayName: string;
    email: string;
    role: IRole;
}

interface SerializedAuth {
    accessToken?: string;
    accessTokenExpirationDate?: string;
    refreshToken?: string;
    refreshTokenExpirationDate?: string;
    role?: IRole;
    username?: string;
    displayName?: string;
    email?: string;
}

export interface IAuthData {
    username?: string;
    displayName?: string;
    email?: string;
    role?: IRole;

    refreshToken?: string;
    refreshTokenExpirationDate?: Date;

    accessToken?: string;
    accessTokenExpirationDate?: Date;
}

export type IRole = "USER" | "ADMIN";
export type AuthStatus = "no_account" | "logged_in";
export interface RendererAuthInfo {
    status: AuthStatus;
    accessToken?: string;
    accessTokenExpiry?: string;
    role?: IRole;
    username?: string;
    displayName?: string;
    email?: string;
}
