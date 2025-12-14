import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {AuthInfo} from "../../../main/web/Typing";

export interface AuthState {
    info: AuthInfo;
}

const initialState: AuthState = {
    info: {
        status: "signup"
    }
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setAuthInfo: (state, action: PayloadAction<AuthInfo>) => ({ ...state, info: action.payload }),
    },
});

export const { setAuthInfo} = authSlice.actions;
export default authSlice.reducer;
