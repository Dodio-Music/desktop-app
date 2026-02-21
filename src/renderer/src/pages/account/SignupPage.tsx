import {FormEvent, useRef, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import useErrorHandling from "@renderer/hooks/useErrorHandling";
import s from "./account.module.css";
import classNames from "classnames";
import toast from "react-hot-toast";
import {IoEyeOffOutline, IoEyeOutline} from "react-icons/io5";
import {testId} from "@renderer/util/testing";

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

    const onExit = () => {
        navigate("/home");
    }

    return (
        <div className={s.page}>
            <form className={s.container} onSubmit={onSignup}>
                <button className={s.back} type={"button"} onClick={onExit}>Back</button>
                <h1 className={s.heading} {...testId("signup-title")}>Create Dodio Account</h1>
                <div className={classNames({[s.error]: hasError("username")})}>
                    <input ref={usernameRef} placeholder={"Username"} autoFocus={true}/>
                    <InvalidInputError inputKey="username"/>
                </div>
                <div className={classNames({[s.error]: hasError("email")})}>
                    <input ref={emailRef} placeholder={"Email"} {...testId("signup-email")}/>
                    <InvalidInputError inputKey="email"/>
                </div>
                <div className={classNames({[s.error]: hasError("password")})}>
                    <div className={s.passwordWrapper}>
                        <input ref={pwRef} type={showPw ? "text" : "password"}
                               placeholder={"Password"} {...testId("signup-password")}/>
                        <button type={"button"} className={s.eyeButton} onClick={() => setShowPw(v => !v)}>
                            {showPw ? <IoEyeOffOutline/> : <IoEyeOutline/>}
                        </button>
                    </div>
                    <InvalidInputError inputKey="password"/>
                </div>
                <button className={classNames(s.button, !buttonClickable ? s.buttonActive : "")}
                        type={"submit"} {...testId("signup-submit")}>Sign Up
                </button>
                <p className={s.createInfo}>Already have an account? <Link className={s.create} to="/login"
                                                                           replace={true} data-testid="signup-title">Log
                    in</Link></p>
            </form>
        </div>
    );
};

export default SignupPage;
