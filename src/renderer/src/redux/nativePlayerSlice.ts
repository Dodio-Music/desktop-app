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
            const payload = action.payload;

            // only updated currenttime if floor different (to avoid unnecessary rerenders)
            const newCurrentTime = Math.floor(payload.currentTime);
            const oldCurrentTime = Math.floor(state.currentTime);

            return {
                ...state,
                ...payload,
                currentTime: newCurrentTime !== oldCurrentTime ? payload.currentTime : state.currentTime
            };
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
