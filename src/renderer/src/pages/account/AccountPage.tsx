import {MdDelete} from "react-icons/md";
import {useNavigate} from "react-router-dom";
import s from "./account.module.css";
import {IoLogOut} from "react-icons/io5";
import toast from "react-hot-toast";
import {errorToString} from "@renderer/util/errorToString";
import {useConfirm} from "@renderer/hooks/useConfirm";
import {useAuth} from "@renderer/hooks/reduxHooks";

const AccountPage = () => {
    const confirm = useConfirm();
    const navigate = useNavigate();

    const {info} = useAuth();

    const deleteAccount = async () => {
        const ok = await confirm({title: "Delete your Account?", body: <>Are you sure you want to delete <strong>your Dodio account?</strong></>});

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
            <div className={"pageWrapper"} >
                <h1>Account page</h1>
                <p className={s.manageAccountContainer}>Manage your account here.</p>

                <div className={s.accountInfoContainer}>
                    <div className={s.userInfoContainer}>
                        <div>
                            <p>Displayname:</p>
                            <p style={{fontStyle: "italic"}}>PlaceHolder</p>
                        </div>

                        <div>
                            <p>Email:</p>
                            <p style={{fontStyle: "italic"}}>{info.email}</p>
                        </div>
                        {/*<p>{info.}</p>*/}
                    </div>

                    <div className={s.userInfoContainer}>
                        <button>Edit</button>

                        <button>Edit</button>

                    </div>
                </div>



                <div className={s.userInfoContainer}>
                    <p>Forgot Password?</p>
                    <button className={s.accountButton}
                            onClick={() => navigate("/resetPassword") }><IoLogOut
                        size={20}/> Reset Password
                    </button>
                </div>

                <button className={s.accountButton}
                        onClick={() => window.api.logout().then(() => navigate("/"))}><IoLogOut
                    size={20}/> Logout
                </button>

                <div className={s.userAccountSettingsContainer}>
                    <h2>Account Removal</h2>
                    <p>Deleting your account will disable your account for some time. You will be sent an <strong>Email</strong> if you want to recover it, if nothing is done the account will be deleted after the recovery token expires.</p>

                    <div className={s.deleteContainer}>
                        <button className={s.accountButton} id={s.delete} onClick={deleteAccount}>
                            <MdDelete size={21}/>Delete Account
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
};

export default AccountPage;
