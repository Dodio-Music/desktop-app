import "./assets/base.css";
import Titlebar from "./layout/Titlebar/Titlebar";
import Sidebar from "./layout/Sidebar/Sidebar";
import ViewBrowser from "./layout/ViewBrowser/ViewBrowser";
import PlaybackBar from "./components/PlaybackBar/PlaybackBar";
import s from "./App.module.css";
import {useZoom} from "./hooks/useZoom";
import {useNavigationShortcuts} from "./hooks/useNavigationShortcuts";
import {Toaster} from "react-hot-toast";
import {useShortcuts} from "@renderer/hooks/useShortcuts";
import {ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle} from "react-resizable-panels";
import {useRef} from "react";


function App() {
    const zoomFactor = useZoom();
    useNavigationShortcuts();
    useShortcuts();

    const leftPanelRef = useRef<ImperativePanelHandle>(null);

    return (
        <>
            <Toaster
                position="bottom-center"
                containerStyle={{marginBottom: "100px"}}
                toastOptions={{
                    style: {
                        backgroundColor: "rgb(50,50,50)",
                        color: "white"
                    }
                }}
                containerClassName={s.toast}
                reverseOrder={false}
            />
            <div className={s.appContainer} data-theme="purple">
                <Titlebar zoomLevel={Math.round(zoomFactor * 100)}/>
                <div className={s.displayContainer}>
                    <PanelGroup className={s.mainContainer} direction={"horizontal"} autoSaveId="mainPanelStructure">

                        <Panel ref={leftPanelRef} collapsible={true} defaultSize={20} minSize={10} maxSize={30}>
                            <Sidebar/>
                        </Panel>
                        <PanelResizeHandle className={s.resizeHandle} />
                        <Panel>
                            <ViewBrowser/>
                        </Panel>
                        <PanelResizeHandle className={s.resizeHandle} />
                        <Panel collapsible={true} defaultSize={10} maxSize={20} minSize={8}>
                            <div className={s.songInfo}></div>
                        </Panel>
                    </PanelGroup>

                    <PlaybackBar/>
                </div>
            </div>
        </>
    );
}

export default App;
