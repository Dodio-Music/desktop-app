import {Panel, Group, Separator, useDefaultLayout} from "react-resizable-panels";
import Sidebar from "@renderer/layout/Sidebar/Sidebar";
import s from "./routing.module.css";
import {useState} from "react";
import {Outlet} from "react-router-dom";

const AppContentLayout = () => {
    const {defaultLayout, onLayoutChanged} = useDefaultLayout({
        id: "unique-layout-id",
        storage: localStorage
    });
    const collapsedSize = 80;
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);

    return (
        <div className={s.panelContainer}>
            <Group className={s.mainContainer} defaultLayout={defaultLayout}
                   onLayoutChanged={(layout) => onLayoutChanged(layout)}>
                <Panel id={"left"}
                       onResize={(nextSize, _, prevSize) => {
                           if (prevSize !== undefined) {
                               const wasCollapsed = prevSize.inPixels === collapsedSize;
                               const isCollapsed = nextSize.inPixels === collapsedSize;
                               if (isCollapsed !== wasCollapsed) {
                                   setIsLeftCollapsed(isCollapsed);
                               }
                           }
                       }}
                       className={s.panel} collapsible collapsedSize={collapsedSize}
                       defaultSize={300} minSize={230} maxSize={400}>
                    <Sidebar isCollapsed={isLeftCollapsed}/>
                </Panel>
                <Separator className={s.resizeHandle}/>
                <Panel id={"main"} className={s.panel}>
                    <div className={s.wrapper}>
                        <Outlet/>
                    </div>
                </Panel>
                <Separator className={s.resizeHandle}/>
                <Panel id={"right"} className={s.panel} collapsible={true} defaultSize={0} maxSize={400}
                       minSize={200} collapsedSize={0}>
                    <div className={s.songInfo}></div>
                </Panel>
            </Group>
        </div>
    );
};

export default AppContentLayout;
