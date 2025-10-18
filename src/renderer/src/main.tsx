import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import App from "./App";
import {HashRouter} from "react-router-dom";
import {store} from "./redux/store";
import {markTrackChange, updatePlayerState} from "./redux/nativePlayerSlice";
import {Provider} from "react-redux";
import {setAuthStatus} from "@renderer/redux/authSlice";

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

window.api.onTrackChange(() => {
    store.dispatch(markTrackChange());
})

window.api.onAuthUpdate((status) => {
    console.log("new auth status", status)
    store.dispatch(setAuthStatus(status));
})
