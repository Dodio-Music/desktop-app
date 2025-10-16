export interface IAuthData {
    hasAccount: boolean;
    access_token?: string,
    access_token_expiry?: Date
    refresh_token?: string,
    refresh_token_expiry?: Date
}
