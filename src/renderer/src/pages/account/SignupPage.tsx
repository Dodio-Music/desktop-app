import {FormEvent, MouseEvent, useRef, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import useErrorHandling from "@renderer/hooks/useErrorHandling";
import s from "./account.module.css";
import classNames from "classnames";
import toast from "react-hot-toast";
import {IoEyeOffOutline, IoEyeOutline} from "react-icons/io5";

const SignupPage = () => {
    const navigate = useNavigate();
    const [buttonClickable, setButtonClickable] = useState(true);
    const usernameRef = useRef<HTMLInputElement>(null);
    const pwRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const [showPw, setShowPw] = useState<boolean>(false);
    const {InvalidInputError, setError, hasError} = useErrorHandling();

    async function onSignup(event?: FormEvent) {
        event?.preventDefault();
        if(!buttonClickable) return;

        const username = usernameRef.current?.value ?? "";
        const email = emailRef.current?.value ?? "";
        const password = pwRef.current?.value ?? "";

        setButtonClickable(false);

        const resOrError = await window.api.signup(username, email, password);
        if(typeof resOrError !== "string") {
            setError(resOrError);
            setButtonClickable(true);
            return;
        }

        setButtonClickable(true);

        toast.success(resOrError);
        navigate("/login", {replace: true});
    }

    const onExit = (event: MouseEvent<HTMLDivElement>) => {
        if(event.target !== event.currentTarget) return;

        navigate(-1);
    }

    return (
        <div className={s.page} onMouseDown={onExit}>
            <form className={s.container} onSubmit={onSignup}>
                <h1 className={s.heading}>Create Dodio Account</h1>
                <div className={classNames({["error"]: hasError("username")})}>
                    <input ref={usernameRef} placeholder={"Username"} autoFocus={true}/>
                    <InvalidInputError inputKey="username"/>
                </div>
                <div className={classNames({["error"]: hasError("email")})}>
                    <input ref={emailRef} placeholder={"Email"}/>
                    <InvalidInputError inputKey="email"/>
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
                <button className={classNames(s.button, !buttonClickable ? s.buttonActive : "")} type={"submit"}>Sign Up</button>
                <p className={s.createInfo}>Already have an account? <Link className={s.create} to="/login" replace={true}>Log in</Link></p>
            </form>
        </div>
    );
};

export default SignupPage;
