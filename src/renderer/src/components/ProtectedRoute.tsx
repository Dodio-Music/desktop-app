import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {useAuth} from "@renderer/hooks/reduxHooks";

interface ProtectedRouteProps {
    children: ReactNode;
    redirect?: boolean
}

const ProtectedRoute = ({ children, redirect = true }: ProtectedRouteProps) => {
    const location = useLocation();
    const {info} = useAuth();

    if(!info.status) return <LoadingPage/>;

    if(info.status === "account") return <>{children}</>;

    if(!redirect) return (
        <div className={"pageWrapper"}>
            <p>Only registered Dodio users can access this page!</p>
        </div>
    );

    return <Navigate to={`/login?url=${encodeURIComponent(location.pathname)}`} replace={true}/>;
};

export default ProtectedRoute;
