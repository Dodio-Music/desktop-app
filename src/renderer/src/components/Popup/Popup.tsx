import {ReactNode, MouseEvent, ElementType, ComponentPropsWithoutRef, useEffect} from "react";
import classNames from "classnames";
import {createPortal} from "react-dom";
import s from "./popup.module.css";

type PopupProps<T extends ElementType> = {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    className?: string;
    as?: T;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

const Popup = <T extends ElementType = "div">({
                                                  open,
                                                  onClose,
                                                  children,
                                                  className,
                                                  as,
                                                  ...rest
                                              }: PopupProps<T>) => {
    const Component = as ?? "div";

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    const onBackdropMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return createPortal(
        <div className={classNames(s.popup_container, open && s.popup_shown)} onMouseDown={onBackdropMouseDown} style={{ pointerEvents: open ? "auto" : "none" }}>
            <Component className={classNames(s.popup_inner, className)}
                 {...rest}
            >
                {children}
            </Component>
        </div>,
        document.body
    );
};

export default Popup;
