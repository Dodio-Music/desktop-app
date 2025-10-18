import {configureStore} from "@reduxjs/toolkit";
import nativePlayerSlice from "./nativePlayerSlice";
import authSlice from "./authSlice";
import shortcutsSlice from "./shortcutsSlice";
import rendererPlayerSlice from "./rendererPlayerSlice";

export const store = configureStore({
    reducer: {
        nativePlayer: nativePlayerSlice,
        auth: authSlice,
        shortcuts: shortcutsSlice,
        rendererPlayer: rendererPlayerSlice
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
