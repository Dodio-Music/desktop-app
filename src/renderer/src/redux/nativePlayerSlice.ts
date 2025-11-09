import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {PlayerState} from "../../../shared/PlayerState";
import {BaseSongEntry} from "../../../shared/TrackInfo";

const initialState: PlayerState = {
    currentTrack: null,
    id: null,
    url: null,
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
        },
        setCurrentTrack(state, action: PayloadAction<BaseSongEntry>) {
            state.currentTrack = action.payload;
        }
    },
});

export const { updatePlayerState, setCurrentTrack } = nativePlayerSlice.actions;
export default nativePlayerSlice.reducer;
