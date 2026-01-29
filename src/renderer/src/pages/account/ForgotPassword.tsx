import {FormEvent, MouseEvent, useEffect, useState} from 'react';
import s from "./account.module.css";
import classNames from "classnames";
import {IoEyeOffOutline, IoEyeOutline} from "react-icons/io5";
import {Link, useNavigate} from "react-router-dom";
import useErrorHandling from "@renderer/hooks/useErrorHandling";
import toast from "react-hot-toast";
import {useAuth} from "@renderer/hooks/reduxHooks";


const ForgotPassword = () => {
    const navigate = useNavigate();
    const [buttonClickable, setButtonClickable] = useState(true);
    const [showPw, setShowPw] = useState<boolean>(false);
    const {InvalidInputError, setError, hasError} = useErrorHandling();

    const [showTokenAndPasswordField, setShowTokenAndPasswordField] = useState<boolean>(false   )
    const [userName, setUserName] = useState<string>("");
    const [resetToken, setResetToken] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");

    //show email if user is logged in
    const {info} = useAuth();

    useEffect(() => {
        if (info.email) setUserName(info.email);
    }, []);


    const onExit = (event: MouseEvent<HTMLDivElement>) => {
        if(event.target !== event.currentTarget) return;

        navigate(-1);
    }

    const submitUserName = async () => {
        const res = await window.api.authRequest("post", "/account/request-password-reset", {
                login: userName
        });
        if(res.type === "ok") {
            toast.success("Email with token sent! Please check your email.")
            setShowTokenAndPasswordField(true);
        } else {
            setError(res.error)
        }
    }

    const sendResetPasswordWithToken = async () => {
        const res = await window.api.authRequest("post", "/account/reset-password", {
            token: resetToken,
            password: newPassword
        })
        if (res.type === "ok"){
            toast.success("Successfully reset password! You can now log in again.")

            await window.api.logout();
            navigate("/login");
        } else {
            setError(res.error)
        }
    }

    const submitButtonPressed = async (e: FormEvent) => {
        e.preventDefault();
        setButtonClickable(false);

        if (!showTokenAndPasswordField){
            await submitUserName();
        } else {
           await sendResetPasswordWithToken();
        }
        setButtonClickable(true);
    }


    return (
        <div className={s.page} onMouseDown={onExit}>
            <form className={s.container} onSubmit={event => submitButtonPressed(event)}>
                <h1 className={s.heading}>Reset Dodio Password</h1>

                <div className={classNames({["error"]: hasError("username")})}>
                    <input value={userName} onChange={e => setUserName(e.currentTarget.value)} placeholder={"Email / Username"} autoFocus={true} />
                    <InvalidInputError inputKey="login"/>
                </div>

                { showTokenAndPasswordField && (
                    <>
                        <div className={classNames({["error"]: hasError("password-reset-token")})}>
                            <input value={resetToken} onChange={e => setResetToken(e.currentTarget.value)} placeholder={"Token"}/>
                            <InvalidInputError inputKey="password-reset-token"/>
                        </div>

                        <div className={classNames({["error"]: hasError("password")})}>
                            <div className={s.passwordWrapper}>
                                <input value={newPassword} type={showPw ? "text" : "password"} placeholder={"New Password"} onChange={e => setNewPassword(e.currentTarget.value)}/>
                                <button type={"button"} className={s.eyeButton} onClick={() => setShowPw(v => !v)}>
                                    {showPw ? <IoEyeOffOutline /> : <IoEyeOutline /> }
                                </button>
                            </div>
                            <InvalidInputError inputKey="password"/>
                        </div>
                    </>
                )}

                <button className={classNames(s.button, !buttonClickable ? s.buttonActive : "")} type={"submit"} >Reset</button>
                <p className={s.createInfo}>Already have an account? <Link className={s.create} to="/login" replace={true}>Log in</Link></p>
            </form>
        </div>
    );
};

export default ForgotPassword;
