import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface PlayerState {
    volume: number | null;  // 0 to 1
    isMuted: boolean | null;
}

const initialState: PlayerState = {
    volume: null,
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
            if(state.isMuted === null) return;
            state.isMuted = !state.isMuted;
        },
        increaseVolume(state) {
            state.volume = state.volume === null ? null : Math.min(1, state.volume + 0.1);
        },
        decreaseVolume(state) {
            state.volume = state.volume === null ? null : Math.max(0, state.volume - 0.1);
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
