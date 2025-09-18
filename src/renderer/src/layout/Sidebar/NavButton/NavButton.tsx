import {useMatch, useNavigate, useResolvedPath} from "react-router-dom";
import s from "../sidebar.module.css";
import {ButtonHTMLAttributes, FC} from "react";

interface NavButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    url: string;
}

const NavButton: FC<NavButtonProps> = ({url, children, ...rest}) => {
    const navigate = useNavigate();
    const resolved = useResolvedPath(url);
    const match = useMatch({path: resolved.pathname, end: true});

    return (
        <button
            className={match ? s.active : ""}
            onClick={() => navigate(url)}
            {...rest}
        >
            {children}
        </button>
    );
};

export default NavButton;
