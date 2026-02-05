import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {PlaylistSongDTO} from "../../../shared/Api";

export interface PlaylistUpdateEvent {
    playlistId: number;
    type: "REORDER" | "ADD" | "REMOVE";
    orderedIds: string[];
    addedSong?: PlaylistSongDTO;
    removedSongId?: string;
}

export interface PlaylistState {
    playlistId: number | null;
    orderedIds: string[];
    songs: Record<string, PlaylistSongDTO>;
}

const initialState: PlaylistState = {
    playlistId: null,
    orderedIds: [],
    songs: {}
};

const playlistSlice = createSlice({
    name: "playlist",
    initialState,
    reducers: {
        setPlaylist(state, action: PayloadAction<{playlistId: number, orderedIds: string[], songs: Record<string, PlaylistSongDTO>}>) {
            state.playlistId = action.payload.playlistId;
            state.orderedIds = action.payload.orderedIds;
            state.songs = action.payload.songs;
        },
        applyPlaylistUpdate(state, action: PayloadAction<PlaylistUpdateEvent>) {
            if (state.playlistId !== action.payload.playlistId) return;

            switch(action.payload.type) {
                case "REORDER":
                    state.orderedIds = action.payload.orderedIds;
                    break;
                case "ADD":
                    if (action.payload.addedSong) {
                        state.songs[action.payload.addedSong.playlistSongId] = action.payload.addedSong;
                        state.orderedIds = action.payload.orderedIds;
                    }
                    break;
                case "REMOVE":
                    if (action.payload.removedSongId) {
                        delete state.songs[action.payload.removedSongId];
                        state.orderedIds = action.payload.orderedIds;
                    }
                    break;
            }
        }
    },
});

export const { applyPlaylistUpdate, setPlaylist } = playlistSlice.actions;
export default playlistSlice.reducer;
