import "./assets/base.css";
import Titlebar from "./layout/Titlebar/Titlebar";
import Sidebar from "./layout/Sidebar/Sidebar";
import ViewBrowser from "./layout/ViewBrowser/ViewBrowser";
import PlaybackBar from "./components/PlaybackBar/PlaybackBar";
import s from "./App.module.css";
import {useZoom} from "./hooks/useZoom";
import {useNavigationShortcuts} from "./hooks/useNavigationShortcuts";

function App() {
    const zoomFactor = useZoom();
    useNavigationShortcuts();

    return (
        <>
            <div className={s.appContainer}>
                <Titlebar zoomLevel={Math.round(zoomFactor * 100)}/>
                <div className={s.displayContainer}>
                    <div className={s.mainContainer}>
                        <Sidebar/>
                        <ViewBrowser/>
                        <div className={s.songInfo}></div>
                    </div>
                    <PlaybackBar/>
                </div>
            </div>
        </>
    );
}

export default App;
