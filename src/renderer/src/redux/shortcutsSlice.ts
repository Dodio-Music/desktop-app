import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ShortcutsState {
    pauseOrResumeKey: string | null;
    muteKey: string | null;
    increaseVolumeKey: string | null;
    decreaseVolumeKey: string | null;
}

const initialState: ShortcutsState = {
    pauseOrResumeKey: "space",
    muteKey: "KeyM",
    increaseVolumeKey: "ArrowUp",
    decreaseVolumeKey: "ArrowDown",
};

const shortcutsSlice = createSlice({
    name: "shortcuts",
    initialState,
    reducers: {
        setPauseOrResumeKey(state, action: PayloadAction<string>) {
            state.pauseOrResumeKey = action.payload;
        },
        setMuteKey(state, action: PayloadAction<string>) {
            state.muteKey = action.payload;
        },
        setIncreaseVolumeKey(state, action: PayloadAction<string>) {
            state.increaseVolumeKey = action.payload;
        },
        setDecreaseVolumeKey(state, action: PayloadAction<string>) {
            state.decreaseVolumeKey = action.payload;
        },
    },
});

export const {
    setPauseOrResumeKey,
    setMuteKey,
    setIncreaseVolumeKey,
    setDecreaseVolumeKey,
} = shortcutsSlice.actions;

export default shortcutsSlice.reducer;
