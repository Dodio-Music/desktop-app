import s from "./titlebar.module.css";
import {VscChromeClose, VscChromeMaximize, VscChromeMinimize, VscChromeRestore} from "react-icons/vsc";
import {FC, useEffect, useState} from "react";
import {GoGear} from "react-icons/go";

interface TitlebarProps {
    zoomLevel: number;
}

const Titlebar: FC<TitlebarProps> = ({zoomLevel}) => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {

        window.electron.isMaximized().then(setIsMaximized);

        const unsubscribe = window.electron.onMaximizeChange(setIsMaximized);

        return () => {
            unsubscribe?.();
        };
    }, []);

    return (
        <div className={s.title_bar}>
            <p className={s.title}>Dodio</p>
            <div className={s.right}>
                {zoomLevel !== 100 &&
                    <button onClick={() => window.api.resetZoom()} className={s.zoomContainer}><p className={s.zoomLevel}>{zoomLevel}%</p></button>}
                <div className={s.settingsContainer}>
                    <GoGear className={s.settings} size={25} />
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
