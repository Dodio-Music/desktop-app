import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {RendererAuthInfo} from "../../../main/web/Typing";

export interface AuthState {
    info: RendererAuthInfo;
}

const initialState: AuthState = {
    info: {
        status: "no_account"
    }
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setAuthInfo: (state, action: PayloadAction<RendererAuthInfo>) => ({ ...state, info: action.payload }),
    },
});

export const { setAuthInfo} = authSlice.actions;
export default authSlice.reducer;
