import {ReactNode, useEffect} from "react";
import s from "@renderer/App.module.css";
import Titlebar from "@renderer/layout/Titlebar/Titlebar";
import PlaybackBar from "@renderer/components/PlaybackBar/PlaybackBar";
import {useZoom} from "@renderer/hooks/layout/useZoom";
import {useNavigationShortcuts} from "@renderer/hooks/layout/useNavigationShortcuts";
import {useShortcuts} from "@renderer/hooks/layout/useShortcuts";
import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "@renderer/redux/store";
import {setGlobalTheme} from "@renderer/redux/uiSlice";
import {themeOptions} from "../../../../shared/themeOptions";
import {useNativeRedirect} from "@renderer/hooks/layout/useNativeRedirect";

const RootLayout = ({children}: {children: ReactNode}) => {
    const dispatch = useDispatch<AppDispatch>();
    const theme = useSelector((state: RootState) => state.uiSlice.theme);
    const zoomFactor = useZoom();
    useNavigationShortcuts();
    useShortcuts();
    useNativeRedirect();

    useEffect(() => {
        window.api.getPreferences().then((prefs) => {
            const theme = themeOptions.find(t => t.name === prefs.theme);
            if(!theme) return;

            dispatch(setGlobalTheme(theme));
        });
    }, [dispatch]);

    useEffect(() => {
        document.documentElement.dataset.theme = theme.name;
    }, [theme]);

    return (
        <div className={s.appContainer}>
            <Titlebar zoomLevel={Math.round(zoomFactor * 100)}/>
            <div className={s.displayContainer}>
                {children}
                <PlaybackBar/>
            </div>
        </div>
    );
};

export default RootLayout;
