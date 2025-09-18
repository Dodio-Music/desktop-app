import s from "./titlebar.module.css";
import {VscChromeClose, VscChromeMaximize, VscChromeMinimize, VscChromeRestore} from "react-icons/vsc";
import {useEffect, useState} from "react";

const Titlebar = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        window.electron.isMaximized().then(setIsMaximized)
        window.electron.onMaximizeChange(setIsMaximized)
    }, []);

    return (
        <div className={s.title_bar}>
            <p className={s.title}>Dodio</p>
            <div className={s.buttons}>
                <button onClick={() => window.electron.minimize()}><VscChromeMinimize /></button>
                <button onClick={() => window.electron.maximize()}>
                    {isMaximized ? <VscChromeRestore /> : <VscChromeMaximize/>}
                </button>
                <button onClick={() => window.electron.close()} id={s.exit}><VscChromeClose /></button>
            </div>
        </div>
    );
};

export default Titlebar;
