import {MdDelete} from "react-icons/md";
import {useNavigate} from "react-router-dom";
import s from "./account.module.css";
import {IoLogOut} from "react-icons/io5";
import {useState} from "react";
import toast from "react-hot-toast";
import ConfirmPopup from "@renderer/components/Popup/ConfirmPopup";
import {errorToString} from "@renderer/util/errorToString";

const AccountPage = () => {
    const [showConfirmWindow, setShowConfirmWindow] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const confirmDelete = async () => {
        setLoading(true);
        const req = await window.api.authRequest("delete", "/account/");
        if (req.type === "ok") {
            toast.success("Successfully deleted account.");
            window.api.logout().then(() => navigate("/"));
        } else {
            toast.error(errorToString(req.error));
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

            <ConfirmPopup
                open={showConfirmWindow}
                onClose={() => setShowConfirmWindow(false)}
                onConfirm={confirmDelete}
                loading={loading}
                title="Are you sure?"
                message="Are you sure you want to delete your Dodio account?"
            />
        </>
    );
};

export default AccountPage;
