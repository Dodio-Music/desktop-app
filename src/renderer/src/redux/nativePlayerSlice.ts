import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {PlayerState, RepeatMode} from "../../../shared/PlayerState";
import {BaseSongEntry} from "../../../shared/TrackInfo";
import {QueueState} from "../../../main/player/QueueManager";

const initialState: PlayerState = {
    currentTrack: null,
    userPaused: true,
    currentTime: 0,
    duration: 0,
    waitingForData: false,
    latency: 0,
    playbackRunning: false,
    repeatMode: null,
    queue: null
};

const nativePlayerSlice = createSlice({
    name: "player",
    initialState,
    reducers: {
        updatePlayerState(state, action: PayloadAction<Partial<PlayerState>>) {
            return {...state, ...action.payload};
        },
        setCurrentTrack(state, action: PayloadAction<BaseSongEntry>) {
            state.currentTrack = action.payload;
        },
        setPendingData(state, action: PayloadAction<Partial<PlayerState>>) {
            return {...state, ...action.payload};
        },
        setRepeatMode(state, action: PayloadAction<RepeatMode>) {
            state.repeatMode = action.payload;
        },
        setQueue(state, action: PayloadAction<QueueState>) {
            state.queue = action.payload;
        }
    },
});

export const { updatePlayerState, setCurrentTrack, setPendingData, setRepeatMode, setQueue } = nativePlayerSlice.actions;
export default nativePlayerSlice.reducer;
