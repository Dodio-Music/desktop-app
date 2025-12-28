import s from "./LoadingPage.module.css";
import {SyncLoader} from "react-spinners";
import {useEffect, useState} from "react";

const LoadingPage = () => {
    const [showSpinner, setShowSpinner] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setShowSpinner(true);
        }, 250);

        return () => window.clearTimeout(timer)
    }, []);

    return (
        <div className={s.page}>
            {showSpinner && <SyncLoader color={"rgba(255,255,255,0.5)"} margin={8}/>}
        </div>
    );
};

export default LoadingPage;
