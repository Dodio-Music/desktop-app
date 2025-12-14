import s from "./titlebar.module.css";
import {VscChromeClose, VscChromeMaximize, VscChromeMinimize, VscChromeRestore} from "react-icons/vsc";
import {FC, useEffect, useState} from "react";
import {GoGear} from "react-icons/go";
import {useNavigate} from "react-router-dom";
import dodos from "../../../../../resources/dodo_transparent_white_256.png";
import {LuLayoutDashboard} from "react-icons/lu";
import {useAuth} from "@renderer/hooks/reduxHooks";

interface TitlebarProps {
    zoomLevel: number;
}

const Titlebar: FC<TitlebarProps> = ({zoomLevel}) => {
    const [isMaximized, setIsMaximized] = useState(false);
    const {info} = useAuth();

    const navigate = useNavigate();

    useEffect(() => {

        window.electron.isMaximized().then(setIsMaximized);

        const unsubscribe = window.electron.onMaximizeChange(setIsMaximized);

        return () => {
            unsubscribe?.();
        };
    }, []);

    return (
        <div className={s.title_bar}>
            <div className={s.icon}><img src={dodos} alt={"Dodio"}/><p className={s.title}>Dodio</p></div>
            <div className={s.right}>
                {zoomLevel !== 100 &&
                    <button onClick={() => window.api.resetZoom()} className={s.zoomContainer}><p className={s.zoomLevel}>{zoomLevel}%</p></button>}

                {/*Admin UI*/}
                {
                    info.role === "ADMIN" &&
                    <button className={s.admin}><LuLayoutDashboard size={23} onClick={() => navigate("/dashboard")}/></button>
                }

                {/*Settings*/}
                <div className={s.settingsContainer}>
                    <GoGear className={s.settings} size={25} onClick={() => navigate("/settings")} />
                </div>

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
