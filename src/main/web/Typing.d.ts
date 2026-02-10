export interface IAuthData {
    hasAccount: boolean;
    access_token?: string,
    access_token_expiry?: Date
    refresh_token?: string,
    refresh_token_expiry?: Date,
    role?: IRole;
    username?: string;
    email?: string;
}

export type IRole = "USER" | "ADMIN";
export type AuthStatus = "login" | "signup" | "account";
export interface AuthInfo {
    accessToken: string;
    status: AuthStatus,
    role?: IRole,
    username?: string,
    email?: string
}
