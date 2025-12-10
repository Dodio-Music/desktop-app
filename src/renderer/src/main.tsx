import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import App from "./App";
import {HashRouter} from "react-router-dom";
import {store} from "./redux/store";
import {updatePlayerState, setCurrentTrack, setPendingData, setRepeatMode} from "./redux/nativePlayerSlice";
import {Provider} from "react-redux";
import {setAuthStatus} from "@renderer/redux/authSlice";
import {isLocalSong} from "../../shared/TrackInfo";

createRoot(document.getElementById("root")!).render(
    <Provider store={store}>
        <StrictMode>
            <HashRouter>
                <App/>
            </HashRouter>
        </StrictMode>
    </Provider>
);

window.api.onPlayerUpdate((state) => {
    store.dispatch(updatePlayerState(state));
});

window.api.onPlayerEvent((event) => {
    switch(event.type) {
        case "media-transition": {
            if(isLocalSong(event.track)) {
                const localTrack = event.track;
                const track = {
                    ...localTrack,
                    createdAt: typeof event.track.createdAt === "string"
                        ? event.track.createdAt
                        : event.track.createdAt?.toISOString()
                }
                store.dispatch(setCurrentTrack(track));
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

window.api.onAuthUpdate((status) => {
    store.dispatch(setAuthStatus(status));
});

(async () => {
    const status = await window.api.getAuthStatus();
    store.dispatch(setAuthStatus(status));
})();

window.api.ready();
