import {configureStore} from "@reduxjs/toolkit";
import nativePlayerSlice from "./nativePlayerSlice";
import authSlice from "./authSlice";
import shortcutsSlice from "./shortcutsSlice";
import rendererPlayerSlice from "./rendererPlayerSlice";
import playlistSlice from "@renderer/redux/playlistSlice";
import notificationsSlice from "@renderer/redux/notificationsSlice";
import uiSlice from "@renderer/redux/uiSlice";
import likeSlice from "@renderer/redux/likeSlice";
import {TypedUseSelectorHook, useDispatch, useSelector} from "react-redux";

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

export const useAppSelector: TypedUseSelectorHook<ReturnType<typeof store.getState>> = useSelector;
export const useAppDispatch = () => useDispatch<typeof store.dispatch>();
