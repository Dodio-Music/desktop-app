import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {AuthStatus} from "../../../shared/Api";

export interface AuthState {
    status: AuthStatus;
}

const initialState: AuthState = {
    status: "signup"
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setAuthStatus: (state, action: PayloadAction<AuthStatus>) => ({ ...state, status: action.payload }),
    },
});

export const { setAuthStatus} = authSlice.actions;
export default authSlice.reducer;
