import s from "./OpenableCover.module.css";
import classNames from "classnames";
import {FC, useEffect, useState} from "react";
import {createPortal} from "react-dom";

interface OpenableCoverProps {
    thumbnailSrc: string;
    fullSrc?: string | null;
    enabled?: boolean;
}

const OpenableCover: FC<OpenableCoverProps> = ({enabled = true, fullSrc, thumbnailSrc}) => {
    const [open, setOpen] = useState(false);
    const canOpen = enabled && Boolean(fullSrc);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);

    return (
        <>
            <img src={thumbnailSrc} alt={"cover"}
                 style={{cursor: canOpen ? "zoom-in" : "default", objectFit: "cover"}}
                 onClick={() => canOpen && setOpen(true)}/>

            {createPortal(
                <div className={classNames(s.imageOverlay, open && s.overlayShown)}
                     onClick={() => setOpen(false)}>
                    <div className={s.fullCoverWrapper}>
                        <img alt={"Cover"} src={fullSrc ?? undefined}/>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default OpenableCover;
