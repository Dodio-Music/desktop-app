import {createContext, ReactNode, useContext} from "react";

export type ConfirmOptions = {
    title: string;
    body: ReactNode;
};

export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

export const useConfirm = () => {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error("ConfirmProvider missing");
    return ctx;
};
