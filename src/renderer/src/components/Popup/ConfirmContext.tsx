import {FC, ReactNode, useCallback, useEffect, useState} from "react";
import ConfirmPopup from "@renderer/components/Popup/ConfirmPopup";
import {ConfirmContext, ConfirmFn, ConfirmOptions} from "@renderer/hooks/useConfirm";

export const ConfirmProvider: FC<{ children: ReactNode }> = ({children}) => {
    const [state, setState] = useState<ConfirmOptions | null>(null);
    const [resolver, setResolver] = useState<(v: boolean) => void>();

    const confirm: ConfirmFn = opts =>
        new Promise(resolve => {
            setState(opts);
            setResolver(() => resolve);
        });

    const close = useCallback((result: boolean) => {
        resolver?.(result);
        setState(null);
    }, [resolver]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                close(false);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [close]);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}

            {state && (
                <ConfirmPopup title={state.title} message={state.body} open onClose={() => close(false)}
                              onConfirm={() => close(true)}/>
            )}
        </ConfirmContext.Provider>
    );
};
