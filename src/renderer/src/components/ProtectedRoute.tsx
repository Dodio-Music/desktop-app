import { ReactNode } from "react";
import {Navigate, useLocation, useNavigate} from "react-router-dom";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {useAuth} from "@renderer/hooks/reduxHooks";
import sa from "../pages/account/account.module.css";
import {IoLogIn} from "react-icons/io5";

interface ProtectedRouteProps {
    children: ReactNode;
    redirect?: boolean
}

const ProtectedRoute = ({ children, redirect = false }: ProtectedRouteProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const {info} = useAuth();

    if(!info.status) return <LoadingPage/>;

    if(info.status === "account") return <>{children}</>;

    if(!redirect) return (
        <div className={"pageWrapper"}>
            <p style={{marginBottom: "10px"}}>Only registered Dodio users can access this page.</p>
            <button onClick={() => navigate("/login")} className={sa.accountButton}><IoLogIn size={19} /> Sign In</button>
        </div>
    );

    return <Navigate to={`/login?url=${encodeURIComponent(location.pathname)}`} replace={true}/>;
};

export default ProtectedRoute;
