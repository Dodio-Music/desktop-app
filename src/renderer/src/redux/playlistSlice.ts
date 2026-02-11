import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {PlaylistSongDTO, PlaylistUserDTO} from "../../../shared/Api";
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
    type: "USERS_CHANGED" | "MEMBER_KICKED" | "META_CHANGE";
    users: PlaylistUserDTO[];
    kickedUser: PlaylistUserDTO;
    playlistName: string;
    isPublic: boolean;
}

export interface PlaylistState {
    playlistId: number | null;
    orderedIds: string[];
    songs: Record<string, PlaylistSongDTO>;
    users: PlaylistUserDTO[];
    currentUser?: PlaylistUserDTO;
    playlistName: string | null;
    isPublic: boolean | null;
    kicked: boolean;
}

const initialState: PlaylistState = {
    playlistId: null,
    orderedIds: [],
    songs: {},
    users: [],
    currentUser: undefined,
    playlistName: null,
    isPublic: null,
    kicked: false,
};

const playlistSlice = createSlice({
    name: "playlist",
    initialState,
    reducers: {
        setPlaylist(state, action: PayloadAction<{playlistId: number, orderedIds: string[], songs: Record<string, PlaylistSongDTO>, users: PlaylistUserDTO[], playlistName: string, isPublic: boolean, kicked: boolean}>) {
            state.playlistId = action.payload.playlistId;
            state.orderedIds = action.payload.orderedIds;
            state.songs = action.payload.songs;
            state.users = action.payload.users;
            state.playlistName = action.payload.playlistName;
            state.isPublic = action.payload.isPublic;
            state.kicked = action.payload.kicked;
        },
        resetPlaylist() {
            return initialState;
        },
        setPlaylistUser(state, action: PayloadAction<PlaylistUserDTO>) {
            state.currentUser = action.payload;
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
        applyPlaylistUpdate(state, action: PayloadAction<PlaylistUpdateEvent>) {
            if (state.playlistId !== action.payload.playlistId) return;

            switch(action.payload.type) {
                case "USERS_CHANGED":
                    state.users = action.payload.users;
                    break;
                case "MEMBER_KICKED":
                    if(state.currentUser?.user.username === action.payload.kickedUser.user.username) {
                        state.kicked = true;
                    }
                    break;
                case "META_CHANGE":
                    state.playlistName = action.payload.playlistName;
                    state.isPublic = action.payload.isPublic;
            }
        }
    },
});

export const { applyPlaylistSongUpdate, applyPlaylistUpdate, setPlaylist, setPlaylistUser, resetPlaylist } = playlistSlice.actions;
export default playlistSlice.reducer;
