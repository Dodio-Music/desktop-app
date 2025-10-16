import {AxiosInstance, AxiosResponse} from "axios";

type RequestMethods = "get" | "post" | "put" | "patch" | "delete";
type AuthStatus = "login" | "signup" | "account";

export interface DodioApi {
    login(login: string, password: string): Promise<boolean>;
    signup(username: string, email: string, password: string): Promise<boolean>;
    refresh();
    logout();
    defaultAccountPage(): AuthStatus;
    authRequest<M extends RequestMethods, T = unknown>(method: M, ...args: Parameters<AxiosInstance[M]>): Promise<AxiosResponse<T>|undefined>,
}
