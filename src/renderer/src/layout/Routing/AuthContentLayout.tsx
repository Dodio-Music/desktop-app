import { Outlet } from "react-router-dom";
import s from "./routing.module.css";

const AuthContentLayout = () => {
    return (
        <div className={s.authWrapper}>
            <Outlet />
        </div>
    );
};

export default AuthContentLayout;
