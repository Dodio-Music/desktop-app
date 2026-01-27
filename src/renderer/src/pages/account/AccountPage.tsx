import {MdDelete} from "react-icons/md";
import {useNavigate} from "react-router-dom";
import s from "./account.module.css";
import {IoLogOut} from "react-icons/io5";
import toast from "react-hot-toast";
import {errorToString} from "@renderer/util/errorToString";
import {useConfirm} from "@renderer/hooks/useConfirm";

const AccountPage = () => {
    const confirm = useConfirm();
    const navigate = useNavigate();

    const deleteAccount = async () => {
        const ok = await confirm({title: "Delete your Account?", body: <>Are you sure you want to <strong>delete</strong> your Dodio account?</>});

        if(!ok) return;

        const req = await window.api.authRequest("delete", "/account/");
        if (req.type === "ok") {
            toast.success("Successfully deleted account.");
            window.api.logout().then(() => navigate("/"));
        } else {
            toast.error(errorToString(req.error));
        }
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
                    <button className={s.accountButton} id={s.delete} onClick={deleteAccount}>
                        <MdDelete size={21}/>Delete Account
                    </button>
                </div>
            </div>
        </>
    );
};

export default AccountPage;
