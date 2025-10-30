import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {PlayerState} from "../../../shared/PlayerState";

const initialState: PlayerState = {
    currentTrackUrl: null,
    userPaused: true,
    currentTime: 0,
    duration: 0,
    waitingForData: false,
    sourceType: "remote",
    latency: 0,
    playbackRunning: false
};

const nativePlayerSlice = createSlice({
    name: "player",
    initialState,
    reducers: {
        updatePlayerState(state, action: PayloadAction<PlayerState>) {
            return { ...state, ...action.payload };
        }
    },
});

export const { updatePlayerState } = nativePlayerSlice.actions;
export default nativePlayerSlice.reducer;
