import React, {ReactNode} from "react";
import Popup from "../Popup/Popup";
import classNames from "classnames";
import s from "./popup.module.css";

interface ConfirmPopupProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void> | void;
    title?: string;
    message?: ReactNode;
    loading?: boolean;
    confirmText?: string;
    cancelText?: string;
}

const ConfirmPopup: React.FC<ConfirmPopupProps> = ({
                                                       open,
                                                       onClose,
                                                       onConfirm,
                                                       title = "Are you sure?",
                                                       message = "This action cannot be undone.",
                                                       loading = false,
                                                       confirmText = "Delete",
                                                       cancelText = "Cancel"
                                                   }) => {
    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <Popup open={open} onClose={onClose}>
            <h1>{title}</h1>
            <p>{message}</p>
            <div className={s.confirmation_buttons}>
                <button className={s.deleteCancel} onClick={onClose}>
                    {cancelText}
                </button>
                <button
                    className={classNames(s.deleteConfirm, loading && s.confirmButtonActive)}
                    onClick={handleConfirm}
                    disabled={loading}
                >
                    {confirmText}
                </button>
            </div>
        </Popup>
    );
};

export default ConfirmPopup;
