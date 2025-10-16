import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {AuthStatus} from "../../../shared/Api";

const initialState = "signup" as AuthStatus;

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setAuthStatus: (_, action: PayloadAction<AuthStatus>) => action.payload
    },
});

export const { setAuthStatus } = authSlice.actions;
export default authSlice.reducer;
