import {FormEvent, useEffect, useRef, useState, MouseEvent} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import toast from "react-hot-toast";
import useErrorHandling from "@renderer/hooks/useErrorHandling";
import s from "./account.module.css";
import classNames from "classnames";

const LoginPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [buttonClickable, setButtonClickable] = useState(true);
    const loginRef = useRef<HTMLInputElement>(null);
    const pwRef = useRef<HTMLInputElement>(null);
    const {setError, InvalidInputError, hasError} = useErrorHandling();
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
            console.log(err)
            setError(err);
            setButtonClickable(true);
            return;
        }
        console.log(err);

        setButtonClickable(true);

        navigate(previousUrl || "/", {replace: true});
        toast.success("Successfully logged in.");
    }

    const onExit = (event: MouseEvent<HTMLDivElement>) => {
        if(event.target !== event.currentTarget) return;

        navigate(-1);
    }

    return (
        <div className={s.page} onClick={onExit}>
            <form className={s.container} onSubmit={onLogin}>
                <h1 className={s.heading}>Log in to Dodio</h1>
                <div className={classNames({[s.error]: hasError("login")})}>
                    <input placeholder={"Email"} ref={loginRef}/>
                    <InvalidInputError inputKey="login"/>
                </div>
                <div className={classNames({[s.error]: hasError("password")})}>
                    <input placeholder={"Password"} ref={pwRef} type="password" />
                    <InvalidInputError inputKey="password"/>
                </div>
                <button className={classNames(s.button, !buttonClickable ? s.buttonActive : "")} type={"submit"}>Log in</button>
                <p className={s.createInfo}>Don&#39;t have an account? <Link className={s.create} to="/signup" replace={true}>Sign up</Link></p>
            </form>
        </div>
    );
};

export default LoginPage;
