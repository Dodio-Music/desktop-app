import {useEffect, useRef} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import toast from "react-hot-toast";
import useErrorHandling from "@renderer/hooks/useErrorHandling";

const LoginPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const previousUrl = searchParams.getAll("url")[0] ?? "";
    const loginRef = useRef<HTMLInputElement>(null);
    const pwRef = useRef<HTMLInputElement>(null);
    const {setError, InvalidInputError} = useErrorHandling();

    useEffect(() => {
        console.log(previousUrl);
        if(previousUrl) {
            toast.error("You need to login to access this page.")
        }
    }, [previousUrl]);

    function onLogin() {
        const login_user = loginRef.current?.value ?? "";
        const password = pwRef.current?.value ?? "";

        window.api.login(login_user, password)
            .then(err => {
                console.log(err);
                if(err) {
                    setError(err)
                    return;
                }
                navigate(previousUrl || "/");
            })
    }
    return (
        <div>
            <h1>Login page</h1>
            <div>
                <label>username</label>
                <input ref={loginRef}/>
            </div>
            <div>
                <label>password</label>
                <input ref={pwRef} type="password" />
            </div>
            <button onClick={onLogin}>Login</button>
            <InvalidInputError inputKey="email"/>
            <Link to="/signup">Create Account</Link>
        </div>
    );
};

export default LoginPage;
