import {configureStore} from "@reduxjs/toolkit";
import nativePlayerSlice from "./nativePlayerSlice";
import authSlice from "./authSlice";
import shortcutsSlice from "./shortcutsSlice";
import rendererPlayerSlice from "./rendererPlayerSlice";
import playlistSlice from "@renderer/redux/playlistSlice";
import notificationsSlice from "@renderer/redux/notificationsSlice";
import uiSlice from "@renderer/redux/uiSlice";
import likeSlice from "@renderer/redux/likeSlice";

export const store = configureStore({
    reducer: {
        nativePlayer: nativePlayerSlice,
        auth: authSlice,
        shortcuts: shortcutsSlice,
        rendererPlayer: rendererPlayerSlice,
        playlistSlice: playlistSlice,
        notifications: notificationsSlice,
        uiSlice: uiSlice,
        likeSlice: likeSlice
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
