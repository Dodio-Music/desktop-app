import {createAsyncThunk, createSlice, PayloadAction} from "@reduxjs/toolkit";
import {NotificationDTO} from "../../../shared/Api";

export const fetchNotificationState = createAsyncThunk(
    "notifications/init",
    async () => {
        return await window.api.authRequest<NotificationDTO>("get", "/notification/all");
    }
);

export interface NotificationState {
    initialized: boolean;
    unreadCount: number;
}

const initialState: NotificationState = {
    initialized: false,
    unreadCount: 0
};

const notifications = createSlice({
    name: "notifications",
    initialState,
    reducers: {
        resetNotifications(state) {
            state.initialized = false;
            state.unreadCount = 0;
        },
        setNotifications(state, action: PayloadAction<number>) {
            state.unreadCount = action.payload;
        },
        incrementUnread(state) {
            state.unreadCount += 1;
        }
    },
    extraReducers: (builder) => {
        builder.addCase(fetchNotificationState.fulfilled, (state, action) => {
            if(action.payload.type === "ok") {
                state.unreadCount = action.payload.value.unreadNotifications;
                console.log(action.payload.value);
                state.initialized = true;
            }
        });
    }
});

export const {
    resetNotifications,
    incrementUnread,
    setNotifications
} = notifications.actions;

export default notifications.reducer;
