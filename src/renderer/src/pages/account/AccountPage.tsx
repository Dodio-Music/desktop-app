import {MdDelete} from "react-icons/md";
import {useNavigate} from "react-router-dom";
import s from "./account.module.css";
import {IoLogOut} from "react-icons/io5";
import {MouseEvent, useState} from "react";
import toast from "react-hot-toast";
import classNames from "classnames";

const AccountPage = () => {
    const [showConfirmWindow, setShowConfirmWindow] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onExit = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;

        setShowConfirmWindow(false);
    };

    const confirmDelete = async () => {
        setLoading(true);
        const req = await window.api.authRequest("delete", "/account/");
        if (req.type === "ok") {
            toast.success("Successfully deleted account.");
            window.api.logout().then(() => navigate("/"));
        } else {
            toast.error("Error while deleting account: " + req.error.error);
        }
        setShowConfirmWindow(false);
        setLoading(false);
    };

    return (
        <>
            <div className={"pageWrapper"}>
                <h1>Account page</h1>
                <p>Manage your account here.</p>
                <div className={s.managementWrapper}>
                    <button className={s.accountButton}
                            onClick={() => window.api.logout().then(() => navigate("/"))}><IoLogOut
                        size={20}/> Logout
                    </button>
                    <button className={s.accountButton} id={s.delete} onClick={() => setShowConfirmWindow(true)}>
                        <MdDelete size={21}/>Delete Account
                    </button>
                </div>
            </div>

            {showConfirmWindow &&
                <div className={s.page} onMouseDown={onExit}>
                    <div className={s.confirmationContainer}>
                        <h1>Are you sure?</h1>
                        <p>Are you sure you want to delete your Dodio account?</p>
                        <div className={s.confirmationButtons}>
                            <button className={s.deleteCancel} onClick={() => setShowConfirmWindow(false)}>Cancel</button>
                            <button className={classNames(s.deleteConfirm, loading && s.confirmButtonActive)}
                                    onClick={() => confirmDelete()}>Delete
                            </button>
                        </div>
                    </div>
                </div>
            }
        </>
    );
};

export default AccountPage;
