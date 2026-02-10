import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {PlaylistRole, PlaylistSongDTO} from "../../../shared/Api";
import toast from "react-hot-toast";

export interface PlaylistSongUpdateEvent {
    playlistId: number;
    type: "REORDER" | "ADD" | "REMOVE";
    orderedIds: string[];
    addedSong?: PlaylistSongDTO;
    removedSongId?: string;
}

export interface PlaylistUpdateEvent {
    playlistId: number;
    type: "ROLE_CHANGED";
    userRole: PlaylistRole;
}

export interface PlaylistState {
    playlistId: number | null;
    orderedIds: string[];
    songs: Record<string, PlaylistSongDTO>;
    userRole: PlaylistRole | null;
}

const initialState: PlaylistState = {
    playlistId: null,
    orderedIds: [],
    songs: {},
    userRole: null
};

const playlistSlice = createSlice({
    name: "playlist",
    initialState,
    reducers: {
        setPlaylist(state, action: PayloadAction<{playlistId: number, orderedIds: string[], songs: Record<string, PlaylistSongDTO>, role: PlaylistRole | null}>) {
            state.playlistId = action.payload.playlistId;
            state.orderedIds = action.payload.orderedIds;
            state.songs = action.payload.songs;
            state.userRole = action.payload.role;
        },
        applyPlaylistSongUpdate(state, action: PayloadAction<PlaylistSongUpdateEvent>) {
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
                        toast.success("Song removed.");
                    }
                    break;
            }
        },
        applyPlaylistRoleUpdate(state, action: PayloadAction<PlaylistRole | null>) {
            state.userRole = action.payload;
        }
    },
});

export const { applyPlaylistSongUpdate, applyPlaylistRoleUpdate, setPlaylist } = playlistSlice.actions;
export default playlistSlice.reducer;
