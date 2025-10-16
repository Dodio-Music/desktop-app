import {configureStore} from "@reduxjs/toolkit";
import playerSlice from "./playerSlice";
import authSlice from "@renderer/redux/authSlice";

export const store = configureStore({
    reducer: {
        player: playerSlice,
        auth: authSlice,
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
