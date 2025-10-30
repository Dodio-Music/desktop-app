import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import App from "./App";
import {HashRouter} from "react-router-dom";
import {store} from "./redux/store";
import {updatePlayerState} from "./redux/nativePlayerSlice";
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

window.api.onAuthUpdate((status) => {
    store.dispatch(setAuthStatus(status));
})
