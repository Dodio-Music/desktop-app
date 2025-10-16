import {useRef} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";

const LoginPage = () => {
    const navigate = useNavigate();
    console.log("search params: ", useSearchParams())
    const [searchParams] = useSearchParams();
    const previousUrl = searchParams.getAll("url")[0] ?? "/";
    const loginRef = useRef<HTMLInputElement>(null);
    const pwRef = useRef<HTMLInputElement>(null);

    function onLogin() {
        const login_user = loginRef.current?.value ?? "";
        const password = pwRef.current?.value ?? "";

        window.api.login(login_user, password)
            .then(data => {
                if(!data) return;
                navigate(previousUrl);
            })
    }
    return (
        <div>
            <h1>Login page</h1>
            <label>username</label>
            <input ref={loginRef}/>
            <label>password</label>
            <input ref={pwRef} type="password" />
            <button onClick={onLogin}>Login</button>
        </div>
    );
};

export default LoginPage;
