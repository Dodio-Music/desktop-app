import s from "./titlebar.module.css";
import {VscChromeClose, VscChromeMaximize, VscChromeMinimize, VscChromeRestore} from "react-icons/vsc";
import {FC, JSX, useEffect, useMemo, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import dodos from "../../../../../resources/dodo_transparent_white_256.png";
import {useAuth} from "@renderer/hooks/reduxHooks";
import {IoIosArrowBack, IoIosArrowForward, IoMdNotifications, IoMdNotificationsOutline} from "react-icons/io";
import {IoSettingsOutline, IoSettingsSharp} from "react-icons/io5";
import {RiDashboardFill, RiDashboardLine} from "react-icons/ri";
import {useSelector} from "react-redux";
import {RootState} from "@renderer/redux/store";
import classNames from "classnames";
import {Tooltip} from "@mui/material";

interface TitlebarProps {
    zoomLevel: number;
}

interface NavButton {
    path: string;
    icon: JSX.Element;
    activeIcon?: JSX.Element;
    show?: boolean;
}

const Titlebar: FC<TitlebarProps> = ({zoomLevel}) => {
    const [isMaximized, setIsMaximized] = useState(false);
    const {info} = useAuth();
    const navigate = useNavigate();
    const {initialized, unreadCount} = useSelector((state: RootState) => state.notifications);
    useLocation();  // used to trigger rerenders on navigation
                    // (back/forward buttons derive from history which doesn't trigger a rerender)

    useEffect(() => {
        window.electron.isMaximized().then(setIsMaximized);
        const unsubscribe = window.electron.onMaximizeChange(setIsMaximized);
        return () => {
            unsubscribe?.();
        };
    }, []);

    const currentHash = window.location.hash;

    const handleNavigate = (path: string) => {
        if (currentHash !== `#${path}`) {
            navigate(path);
        }
    };

    const navButtons: NavButton[] = useMemo(() => [
        {
            path: "/dashboard",
            icon: <RiDashboardLine size={26} />,
            activeIcon: <RiDashboardFill size={26} />,
            show: info.role === "ADMIN" && info.status === "account",
        },
        {
            path: "/notifications",
            icon: <IoMdNotificationsOutline id={s.notif} size={27} />,
            activeIcon: <IoMdNotifications id={s.notif} size={27} />,
            show: info.status === "account",
        },
        {
            path: "/settings",
            icon: <IoSettingsOutline size={25} id={s.settings} />,
            activeIcon: <IoSettingsSharp size={25} id={s.settings} />,
            show: true,
        },
    ], [info]);

    const historyIndex = window.history.state?.idx ?? 0;

    const canGoBack = historyIndex > 0;
    const canGoForward = historyIndex < window.history.length - 1;

    return (
        <div className={s.title_bar}>
            <div className={s.left}>
                <div className={s.leftsub}><img src={dodos} alt={"Dodio"}/><p className={s.title}>Dodio</p></div>
                <div className={classNames(s.leftsub, s.nav)}>
                    <Tooltip title={canGoBack ? "Go Back" : ""}><button onClick={() => navigate(-1)} disabled={!canGoBack}><IoIosArrowBack /></button></Tooltip>
                    <Tooltip title={canGoForward ? "Go Forward" : ""}><button onClick={() => navigate(1)} disabled={!canGoForward}><IoIosArrowForward /></button></Tooltip>
                </div>
            </div>
            <div className={s.right}>
                {zoomLevel !== 100 &&
                    <button onClick={() => window.api.resetZoom()} className={s.zoomContainer}><p className={s.zoomLevel}>{zoomLevel}%</p></button>}

                {navButtons.map((btn, idx) => btn.show ? (
                    <div key={idx} className={s.itemWrapper}>
                        <div className={s.item} onClick={() => handleNavigate(btn.path)} id={btn.path === "/settings" ? s.settingsContainer : ""}>
                            {currentHash.startsWith(`#${btn.path}`) && btn.activeIcon ? btn.activeIcon : btn.icon}
                        </div>
                        {btn.path === "/notifications" && initialized && unreadCount > 0 && <div className={s.notifPopover}>{unreadCount}</div>}
                    </div>
                ) : null)}

                <div className={s.buttons}>
                    <button onClick={() => window.electron.minimize()}><VscChromeMinimize/></button>
                    <button onClick={() => window.electron.maximize()}>
                        {isMaximized ? <VscChromeRestore/> : <VscChromeMaximize/>}
                    </button>
                    <button onClick={() => window.electron.close()} id={s.exit}><VscChromeClose/></button>
                </div>
            </div>
        </div>
    );
};

export default Titlebar;
