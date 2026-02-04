import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import App from "./App";
import {HashRouter} from "react-router-dom";
import {store} from "./redux/store";
import {updatePlayerState, setCurrentTrack, setPendingData, setRepeatMode} from "./redux/nativePlayerSlice";
import {Provider} from "react-redux";
import {setAuthInfo} from "@renderer/redux/authSlice";
import {isLocalSong} from "../../shared/TrackInfo";
import {CssBaseline, ThemeProvider} from "@mui/material";
import {theme} from "./muiTheme";
import {ConfirmProvider} from "@renderer/components/Popup/ConfirmContext";
import toast from "react-hot-toast";
import {connectStomp} from "@renderer/ws/stompClient";

createRoot(document.getElementById("root")!).render(
    <Provider store={store}>
        <StrictMode>
            <ThemeProvider theme={theme}>
                <HashRouter>
                    <ConfirmProvider>
                        <CssBaseline/>
                        <App/>
                    </ConfirmProvider>
                </HashRouter>
            </ThemeProvider>
        </StrictMode>
    </Provider>
);

window.api.onPlayerUpdate((state) => {
    store.dispatch(updatePlayerState(state));
});

window.api.onToast((type, msg) => {
    switch(type) {
        case "success": toast.success(msg);
            break;
        default: toast.error(msg);
    }
});

window.api.onPlayerEvent((event) => {
    switch (event.type) {
        case "media-transition": {
            if (isLocalSong(event.track)) {
                const localTrack = event.track;
                store.dispatch(setCurrentTrack(localTrack));
            } else {
                store.dispatch(setCurrentTrack(event.track));
            }
            break;
        }
        case "pending-data": {
            store.dispatch(setPendingData(event.data));
            break;
        }
        case "repeat-mode": {
            store.dispatch(setRepeatMode(event.repeatMode));
            break;
        }
    }
});

window.api.onAuthUpdate((info) => {
    store.dispatch(setAuthInfo(info));
});

connectStomp();

window.api.ready();
