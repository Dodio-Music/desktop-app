import React, {FormEvent, MouseEvent, useRef, useState} from 'react';
import s from "./account.module.css";
import classNames from "classnames";
import {IoEyeOffOutline, IoEyeOutline} from "react-icons/io5";
import {Link, useNavigate} from "react-router-dom";
import useErrorHandling from "@renderer/hooks/useErrorHandling";
import toast from "react-hot-toast";


const ForgotPassword = () => {
    const navigate = useNavigate();
    const [buttonClickable, setButtonClickable] = useState(true);
    const usernameRef = useRef<HTMLInputElement>(null);
    const pwRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const [showPw, setShowPw] = useState<boolean>(false);
    const {InvalidInputError, setError, hasError} = useErrorHandling();

    const [showTokenAndPasswordField, setShowTokenAndPasswordField] = useState<boolean>(false)

    async function onSignup(event?: FormEvent) {

        setShowTokenAndPasswordField(true)
        setButtonClickable(false);
        //ToDO: request and then set ButtonClickable = true
        toast.success("Successfully created account!");
        // navigate("/login", {replace: true});
    }

    const onExit = (event: MouseEvent<HTMLDivElement>) => {
        if(event.target !== event.currentTarget) return;

        navigate(-1);
    }

    return (
        <div className={s.page} onMouseDown={onExit}>
            <form className={s.container} onSubmit={onSignup}>
                <h1 className={s.heading}>Reset Dodio Password</h1>
                <div className={classNames({[s.error]: hasError("username")})}>
                    <input ref={usernameRef} placeholder={"Username"} autoFocus={true}/>
                    <InvalidInputError inputKey="username"/>
                </div>

                { showTokenAndPasswordField && (
                    <>
                        <div className={classNames({[s.error]: hasError("email")})}>
                            <input ref={emailRef} placeholder={"Token"}/>
                            <InvalidInputError inputKey="email"/>
                        </div>
                        <div className={classNames({[s.error]: hasError("password")})}>
                            <div className={s.passwordWrapper}>
                                <input ref={pwRef} type={showPw ? "text" : "password"} placeholder={"New Password"}/>
                                <button type={"button"} className={s.eyeButton} onClick={() => setShowPw(v => !v)}>
                                    {showPw ? <IoEyeOffOutline /> : <IoEyeOutline /> }
                                </button>
                            </div>
                            <InvalidInputError inputKey="password"/>
                        </div>
                    </>
                )}

                <button className={classNames(s.button, !buttonClickable ? s.buttonActive : "")} type={"submit"}>Reset</button>
                <p className={s.createInfo}>Already have an account? <Link className={s.create} to="/login" replace={true}>Log in</Link></p>
            </form>
        </div>
    );
};

export default ForgotPassword;
