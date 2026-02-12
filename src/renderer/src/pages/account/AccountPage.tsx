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
            {/*<div className={"pageWrapper"} >*/}
            {/*    <h1>Account page</h1>*/}
            {/*    <p className={s.manageAccountContainer}>Manage your account here.</p>*/}

            {/*    <div className={s.accountInfoContainer}>*/}
            {/*        <div className={s.userInfoContainer}>*/}
            {/*            <div>*/}
            {/*                <p>Displayname:</p>*/}
            {/*                <p style={{fontStyle: "italic"}}>PlaceHolder</p>*/}
            {/*            </div>*/}

            {/*            <div>*/}
            {/*                <p>Email:</p>*/}
            {/*                <p style={{fontStyle: "italic"}}>{info.email}</p>*/}
            {/*            </div>*/}
            {/*            /!*<p>{info.}</p>*!/*/}
            {/*        </div>*/}

            {/*        <div className={s.userInfoContainer}>*/}
            {/*            <button>Edit</button>*/}

            {/*            <button>Edit</button>*/}

            {/*        </div>*/}
            {/*    </div>*/}



            {/*    <div className={s.userInfoContainer}>*/}
            {/*        <p>Forgot Password?</p>*/}
            {/*        <button className={s.accountButton}*/}
            {/*                onClick={() => navigate("/resetPassword") }><IoLogOut*/}
            {/*            size={20}/> Reset Password*/}
            {/*        </button>*/}
            {/*    </div>*/}

            {/*    <button className={s.accountButton}*/}
            {/*            onClick={() => window.api.logout().then(() => navigate("/"))}><IoLogOut*/}
            {/*        size={20}/> Logout*/}
            {/*    </button>*/}

            {/*    <div className={s.userAccountSettingsContainer}>*/}
            {/*        <h2>Account Removal</h2>*/}
            {/*        <p>Deleting your account will disable your account for some time. You will be sent an <strong>Email</strong> if you want to recover it, if nothing is done the account will be deleted after the recovery token expires.</p>*/}

            {/*        <div className={s.deleteContainer}>*/}
            {/*            <button className={s.accountButton} id={s.delete} onClick={deleteAccount}>*/}
            {/*                <MdDelete size={21}/>Delete Account*/}
            {/*            </button>*/}
            {/*        </div>*/}

            {/*    </div>*/}
            {/*</div>*/}
            <div className="pageWrapper">
                <h1 className={s.title}>My Account</h1>

                {/* ACCOUNT CARD */}
                <section className={s.card} >
                    <h2 className={s.cardTitle}>Account Information</h2>

                    <div className={s.infoRow}>
                        <div>
                            <span className={s.label}>Display Name</span>
                            <span className={s.value}>{info.displayname}</span>
                        </div>
                        <button className={s.secondary}>Edit</button>
                    </div>

                    <div className={s.infoRow}>
                        <div>
                            <span className={s.label}>User Name</span>
                            <span className={s.value}>{info.username}</span>
                        </div>
                    </div>

                    <div className={s.infoRow}>
                        <div>
                            <span className={s.label}>Email</span>
                            <span className={s.value}>{info.email}</span>
                        </div>
                    </div>
                </section>

                {/* SECURITY */}
                <section className={s.cardSecurity}>
                    <h2 className={s.cardTitle}>Security</h2>

                    <div className={s.securityContainerButton}>
                        <button
                            className={s.accountButton}
                            onClick={() => navigate("/resetPassword")}
                        >
                            Reset Password
                        </button>

                        <button
                            className={s.accountButton}
                            onClick={() => window.api.logout().then(() => navigate("/"))}
                        >
                            <IoLogOut size={18} /> Logout
                        </button>
                    </div>

                </section>

                {/* DANGER ZONE */}
                <section className={`${s.card} ${s.danger}`}>
                    <h2 className={s.dangerTitle}>Danger Zone</h2>

                    <p className={s.dangerText}>
                        Deleting your account will disable it temporarily.
                        If no recovery action is taken, it will be permanently deleted.
                    </p>

                    <button className={s.deleteButton} onClick={deleteAccount}>
                        <MdDelete size={18} /> Delete Account
                    </button>
                </section>
            </div>

        </>
    );
};

export default AccountPage;
