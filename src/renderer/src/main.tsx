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

createRoot(document.getElementById("root")!).render(
    <Provider store={store}>
        <StrictMode>
            <ThemeProvider theme={theme}>
                <HashRouter>
                    <CssBaseline/>
                    <App/>
                </HashRouter>
            </ThemeProvider>
        </StrictMode>
    </Provider>
);

window.api.onPlayerUpdate((state) => {
    store.dispatch(updatePlayerState(state));
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

window.api.ready();
