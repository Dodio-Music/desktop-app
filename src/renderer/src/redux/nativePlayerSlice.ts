import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {PlayerState} from "../../../shared/PlayerState";
import {BaseSongEntry} from "../../../shared/TrackInfo";

const initialState: PlayerState = {
    currentTrack: null,
    userPaused: true,
    currentTime: 0,
    duration: 0,
    waitingForData: false,
    latency: 0,
    playbackRunning: false
};

const nativePlayerSlice = createSlice({
    name: "player",
    initialState,
    reducers: {
        updatePlayerState(state, action: PayloadAction<PlayerState>) {
            return {...state, ...action.payload};
        },
        setCurrentTrack(state, action: PayloadAction<BaseSongEntry>) {
            state.currentTrack = action.payload;
        },
        setPendingData(state, action: PayloadAction<Partial<PlayerState>>) {
            return {...state, ...action.payload};
        }
    },
});

export const { updatePlayerState, setCurrentTrack, setPendingData } = nativePlayerSlice.actions;
export default nativePlayerSlice.reducer;
