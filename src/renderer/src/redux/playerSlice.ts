import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {PlayerState} from "../../../shared/PlayerState";

const initialState: PlayerState = {
    currentTrack: null,
    userPaused: true,
    currentTime: 0,
    duration: 0,
    waitingForData: false,
    sourceType: "remote",
    latency: 0,
    trackChangeToken: 0,
    playbackRunning: false
};

const playerSlice = createSlice({
    name: "player",
    initialState,
    reducers: {
        updatePlayerState(state, action: PayloadAction<PlayerState>) {
            return { ...state, ...action.payload };
        },
        markTrackChange(state) {
            state.trackChangeToken++;
        }
    },
});

export const { updatePlayerState, markTrackChange } = playerSlice.actions;
export default playerSlice.reducer;
