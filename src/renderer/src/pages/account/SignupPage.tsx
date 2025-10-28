import {useRef} from "react";
import {Link, useNavigate} from "react-router-dom";
import useErrorHandling from "@renderer/hooks/useErrorHandling";

const SignupPage = () => {
    const navigate = useNavigate();
    const usernameRef = useRef<HTMLInputElement>(null);
    const pwRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const {InvalidInputError, setError} = useErrorHandling();

    function onSignup() {
        const username = usernameRef.current?.value ?? "";
        const email = emailRef.current?.value ?? "";
        const password = pwRef.current?.value ?? "";

        if(username == "" || email == "" || password == "") return;

        window.api.signup(username, email, password)
            .then(err => {
                if(err) {
                    setError(err);
                }
                navigate("/login");
            })
    }

    return (
        <div>
            <h1>Signup page</h1>
            <div>
                <label>username</label>
                <input ref={usernameRef}/>
                <InvalidInputError inputKey="username" />
            </div>
            <div>
                <label>email</label>
                <input ref={emailRef} />
                <InvalidInputError inputKey="email"/>
            </div>
            <div>
                <label>password</label>
                <input ref={pwRef} type="password"/>
                <InvalidInputError inputKey="password"/>
            </div>
            <button onClick={onSignup}>Signup</button>
            <Link to="/login">Login</Link>
        </div>
    );
};

export default SignupPage;
