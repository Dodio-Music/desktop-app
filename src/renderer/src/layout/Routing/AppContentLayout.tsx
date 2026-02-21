import {ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle} from "react-resizable-panels";
import Sidebar from "@renderer/layout/Sidebar/Sidebar";
import s from "./routing.module.css";
import CollapsedSidebar from "@renderer/layout/Sidebar/CollapsedSidebar";
import {useRef, useState} from "react";
import {Outlet} from "react-router-dom";

const AppContentLayout = () => {
    const leftPanelRef = useRef<ImperativePanelHandle>(null);
    const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

    return (
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
                    <div className={s.wrapper}>
                        <Outlet/>
                    </div>
                </Panel>
                <PanelResizeHandle className={s.resizeHandle}/>
                <Panel order={4} className={s.panel} collapsible={true} defaultSize={10} maxSize={20}
                       minSize={8}>
                    <div className={s.songInfo}></div>
                </Panel>
            </PanelGroup>
        </div>
    );
};

export default AppContentLayout;
