import {FormEvent, useEffect, useRef, useState} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import toast from "react-hot-toast";
import useErrorHandling from "@renderer/hooks/useErrorHandling";
import s from "./account.module.css";
import classNames from "classnames";
import {IoEyeOffOutline, IoEyeOutline} from "react-icons/io5";

const LoginPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [buttonClickable, setButtonClickable] = useState(true);
    const loginRef = useRef<HTMLInputElement>(null);
    const pwRef = useRef<HTMLInputElement>(null);
    const {setError, InvalidInputError, hasError} = useErrorHandling();
    const [showPw, setShowPw] = useState<boolean>(false);
    const toastShownRef = useRef(false);
    const previousUrl = searchParams.getAll("url")[0] ?? "";


    useEffect(() => {
        if(previousUrl && !toastShownRef.current) {
            toast.error("You need to log in to access this page.");
            toastShownRef.current = true;
        }
    }, [previousUrl]);

    async function onLogin(event?: FormEvent) {
        event?.preventDefault();
        if(!buttonClickable) return;

        const login_user = loginRef.current?.value ?? "";
        const password = pwRef.current?.value ?? "";

        setButtonClickable(false);

        const err = await window.api.login(login_user, password);
        if(err) {
            setError(err);
            setButtonClickable(true);
            return;
        }

        setButtonClickable(true);

        navigate(previousUrl || "/", {replace: true});
        toast.success("Successfully logged in.");
    }

    const onExit = () => {
        navigate("/home");
    }

    return (
        <div className={s.page}>
            <form className={s.container} onSubmit={onLogin}>
                <button className={s.back} type={"button"} onClick={onExit}>Back</button>
                <h1 className={s.heading}>Log in to Dodio</h1>
                <div className={classNames({["error"]: hasError("login")})}>
                    <input placeholder={"Email / Username"} ref={loginRef} autoFocus={true}/>
                    <InvalidInputError inputKey="login"/>
                </div>
                <div className={classNames({["error"]: hasError("password")})}>
                    <div className={s.passwordWrapper}>
                        <input ref={pwRef} type={showPw ? "text" : "password"} placeholder={"Password"}/>
                        <button type={"button"} className={s.eyeButton} onClick={() => setShowPw(v => !v)}>
                            {showPw ? <IoEyeOffOutline /> : <IoEyeOutline /> }
                        </button>
                    </div>
                    <InvalidInputError inputKey="password"/>
                </div>
                <button className={classNames(s.button, !buttonClickable ? s.buttonActive : "")} type={"submit"}>Log in</button>
                <p className={s.createInfo}> <Link className={s.forgotPassword} to="/resetPassword" replace={true}>Forgot your password?</Link></p>
                <p className={s.createInfo}>Don&#39;t have an account? <Link className={s.create} to="/signup" replace={true}>Sign up</Link></p>
            </form>
        </div>
    );
};

export default LoginPage;
