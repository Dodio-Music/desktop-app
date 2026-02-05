import {createSlice, PayloadAction} from "@reduxjs/toolkit";

interface PlaylistOrderSnapshotEvent {
    playlistId: number
    orderedIds: string[];
}

export interface PlaylistState {
    playlistId: number | null;
    orderedIds: string[];
}

const initialState: PlaylistState = {
    playlistId: null,
    orderedIds: []
};

const playlistSlice = createSlice({
    name: "playlist",
    initialState,
    reducers: {
        applyPlaylistOrder(state, action: PayloadAction<PlaylistOrderSnapshotEvent>) {
            console.log(action);
            if (state.playlistId !== action.payload.playlistId) return;
            state.orderedIds = action.payload.orderedIds;
        },
        setPlaylist(state, action: PayloadAction<PlaylistOrderSnapshotEvent>) {
            state.playlistId = action.payload.playlistId;
            state.orderedIds = action.payload.orderedIds;
        }
    },
});

export const { applyPlaylistOrder, setPlaylist } = playlistSlice.actions;
export default playlistSlice.reducer;
