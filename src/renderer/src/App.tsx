import "./assets/base.css";
import Titlebar from "./layout/Titlebar/Titlebar";
import Sidebar from "./layout/Sidebar/Sidebar";
import ViewBrowser from "./layout/ViewBrowser/ViewBrowser";
import PlaybackBar from "./components/PlaybackBar/PlaybackBar";
import s from "./App.module.css";
import {useZoom} from "./hooks/layout/useZoom";
import {useNavigationShortcuts} from "./hooks/layout/useNavigationShortcuts";
import {Toaster} from "react-hot-toast";
import {useShortcuts} from "@renderer/hooks/layout/useShortcuts";
import {ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle} from "react-resizable-panels";
import {useEffect, useRef, useState} from "react";
import CollapsedSidebar from "@renderer/layout/Sidebar/CollapsedSidebar";
import RealtimeNotificationBridge from "@renderer/components/Bridge/RealtimeNotificationBridge";
import {useDispatch, useSelector} from "react-redux";
import {fetchNotificationState, resetNotifications} from "@renderer/redux/notificationsSlice";
import {AppDispatch, RootState} from "@renderer/redux/store";

function App() {
    const zoomFactor = useZoom();
    useNavigationShortcuts();
    useShortcuts();

    const leftPanelRef = useRef<ImperativePanelHandle>(null);
    const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

    const username = useSelector((state: RootState) => state.auth.info.username);
    const initialized = useSelector((state: RootState) => state.notifications.initialized);
    const dispatch = useDispatch<AppDispatch>();

    useEffect(() => {
        if (!username) {
            dispatch(resetNotifications());
            return;
        }

        if (!initialized) {
            dispatch(fetchNotificationState());
        }
    }, [username]);

    return (
        <>
            <RealtimeNotificationBridge/>
            <Toaster
                position="bottom-center"
                containerStyle={{marginBottom: "100px", marginTop: "60px"}}
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
                    <div className={s.panelContainer}>
                        {leftPanelCollapsed && <CollapsedSidebar/>}
                        <PanelGroup className={s.mainContainer} direction={"horizontal"}
                                    autoSaveId="mainPanelStructure">
                            <Panel order={2} onCollapse={() => setLeftPanelCollapsed(true)}
                                   onExpand={() => setLeftPanelCollapsed(false)}
                                   className={s.panel} ref={leftPanelRef}
                                   collapsible defaultSize={20} minSize={15} maxSize={30}
                            >
                                <Sidebar/>
                            </Panel>
                            <PanelResizeHandle className={s.resizeHandle}/>
                            <Panel order={3} className={s.panel}>
                                <ViewBrowser/>
                            </Panel>
                            <PanelResizeHandle className={s.resizeHandle}/>
                            <Panel order={4} className={s.panel} collapsible={true} defaultSize={10} maxSize={20}
                                   minSize={8}>
                                <div className={s.songInfo}></div>
                            </Panel>
                        </PanelGroup>
                    </div>
                    <PlaybackBar/>
                </div>
            </div>
        </>
    );
}

export default App;
