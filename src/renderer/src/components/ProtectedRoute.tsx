import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import LoadingPage from "@renderer/pages/LoadingPage/LoadingPage";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";

interface ProtectedRouteProps {
    children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const location = useLocation();
    const authStatus = useSelector((state: RootState) => state.auth.status);

    if(!authStatus) return <LoadingPage/>;

    if(authStatus === "account") return <>{children}</>

    return <Navigate to={`/login?url=${encodeURIComponent(location.pathname)}`} replace={true}/>;
};

export default ProtectedRoute;
