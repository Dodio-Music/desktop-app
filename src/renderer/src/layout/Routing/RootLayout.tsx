import {ReactNode} from "react";
import s from "@renderer/App.module.css";
import Titlebar from "@renderer/layout/Titlebar/Titlebar";
import PlaybackBar from "@renderer/components/PlaybackBar/PlaybackBar";
import {useZoom} from "@renderer/hooks/layout/useZoom";
import {useNavigationShortcuts} from "@renderer/hooks/layout/useNavigationShortcuts";
import {useShortcuts} from "@renderer/hooks/layout/useShortcuts";

const RootLayout = ({children}: {children: ReactNode}) => {
    const zoomFactor = useZoom();
    useNavigationShortcuts();
    useShortcuts();

    return (
        <div className={s.appContainer} data-theme="purple">
            <Titlebar zoomLevel={Math.round(zoomFactor * 100)}/>
            <div className={s.displayContainer}>
                {children}
                <PlaybackBar/>
            </div>
        </div>
    );
};

export default RootLayout;
