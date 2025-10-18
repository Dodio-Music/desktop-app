import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface PlayerState {
    volume: number;  // 0 to 1
    isMuted: boolean;
}

const initialState: PlayerState = {
    volume: 1,
    isMuted: false,
};

const rendererPlayerSlice = createSlice({
    name: "player",
    initialState,
    reducers: {
        setVolume(state, action: PayloadAction<number>) {
            state.volume = Math.min(1, Math.max(0, action.payload));
        },
        setIsMuted(state, action: PayloadAction<boolean>) {
            state.isMuted = action.payload;
        },
        toggleMute(state) {
            state.isMuted = !state.isMuted;
        },
        increaseVolume(state) {
            state.volume = Math.min(1, state.volume + 0.1);
        },
        decreaseVolume(state) {
            state.volume = Math.max(0, state.volume - 0.1);
        },
    },
});

export const {
    setVolume,
    setIsMuted,
    toggleMute,
    increaseVolume,
    decreaseVolume,
} = rendererPlayerSlice.actions;

export default rendererPlayerSlice.reducer;
