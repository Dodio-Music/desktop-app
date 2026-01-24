import {ReactNode, MouseEvent, ElementType, ComponentPropsWithoutRef} from "react";
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
    if (!open) return null;

    const Component = as ?? "div";

    const onBackdropMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        createPortal(
            <div className={s.popup_container} onMouseDown={onBackdropMouseDown}>
                <Component className={classNames(s.popup_inner, className)}
                     {...rest}
                >
                    {children}
                </Component>
            </div>,
            document.body
        )
    );
};

export default Popup;
