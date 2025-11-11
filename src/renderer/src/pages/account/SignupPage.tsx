import {FormEvent, MouseEvent, useRef, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import useErrorHandling from "@renderer/hooks/useErrorHandling";
import s from "./account.module.css";
import classNames from "classnames";
import toast from "react-hot-toast";

const SignupPage = () => {
    const navigate = useNavigate();
    const [buttonClickable, setButtonClickable] = useState(true);
    const usernameRef = useRef<HTMLInputElement>(null);
    const pwRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const {InvalidInputError, setError, hasError} = useErrorHandling();

    async function onSignup(event?: FormEvent) {
        event?.preventDefault();
        if(!buttonClickable) return;

        const username = usernameRef.current?.value ?? "";
        const email = emailRef.current?.value ?? "";
        const password = pwRef.current?.value ?? "";

        setButtonClickable(false);

        const err = await window.api.signup(username, email, password);
        if(err) {
            setError(err);
            setButtonClickable(true);
            return;
        }

        setButtonClickable(true);

        toast.success("Successfully created account! You can now log in.");
        navigate("/login", {replace: true});
    }

    const onExit = (event: MouseEvent<HTMLDivElement>) => {
        if(event.target !== event.currentTarget) return;

        navigate(-1);
    }

    return (
        <div className={s.page} onClick={onExit}>
            <form className={s.container} onSubmit={onSignup}>
                <h1 className={s.heading}>Create Dodio Account</h1>
                <div className={classNames({[s.error]: hasError("username")})}>
                    <input ref={usernameRef} placeholder={"Username"}/>
                    <InvalidInputError inputKey="username"/>
                </div>
                <div className={classNames({[s.error]: hasError("email")})}>
                    <input ref={emailRef} placeholder={"Email"}/>
                    <InvalidInputError inputKey="email"/>
                </div>
                <div className={classNames({[s.error]: hasError("password")})}>
                    <input ref={pwRef} type="password" placeholder={"Password"}/>
                    <InvalidInputError inputKey="password"/>
                </div>
                <button className={s.button} type={"submit"}>Sign Up</button>
                <p className={s.createInfo}>Already have an account? <Link className={s.create} to="/login" replace={true}>Log in</Link></p>
            </form>
        </div>
    );
};

export default SignupPage;
