import s from "./LoadingPage.module.css";
import {SyncLoader} from "react-spinners";

const LoadingPage = () => {
    return (
        <div className={s.page}>
            <SyncLoader color={"rgba(255,255,255,0.5)"} margin={8}/>
        </div>
    );
};

export default LoadingPage;
