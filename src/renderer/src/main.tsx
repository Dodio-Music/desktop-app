import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import App from "./App";
import {BrowserRouter} from "react-router-dom";
import {store} from "./redux/store";
import {updatePlayerState} from "./redux/playerSlice";
import {Provider} from "react-redux";

createRoot(document.getElementById("root")!).render(
    <Provider store={store}>
        <StrictMode>
            <BrowserRouter>
                <App/>
            </BrowserRouter>
        </StrictMode>
    </Provider>
);

window.api.onPlayerUpdate((state) => {
    store.dispatch(updatePlayerState(state));
});
