import {createSlice, PayloadAction} from "@reduxjs/toolkit";

interface PlaylistSongOrder {
    playlistSongId: string;
    position: number;
}

interface PlaylistOrderSnapshotEvent {
    playlistId: number
    songs: PlaylistSongOrder[];
}

export interface PlaylistState {
    playlistId: number | null;
    songs: PlaylistSongOrder[];
}

const initialState: PlaylistState = {
    playlistId: null,
    songs: []
};

const playlistSlice = createSlice({
    name: "playlist",
    initialState,
    reducers: {
        applyPlaylistOrder(state, action: PayloadAction<PlaylistOrderSnapshotEvent>) {
            const { playlistId, songs } = action.payload;

            if (state.playlistId !== playlistId) return;

            const orderMap = new Map(
                songs.map(s => [s.playlistSongId, s.position])
            );

            for (const song of state.songs) {
                const pos = orderMap.get(song.playlistSongId);
                if (pos !== undefined) {
                    song.position = pos;
                }
            }

            state.songs.sort((a, b) => a.position - b.position);
        },
        setPlaylist(state, action: PayloadAction<PlaylistOrderSnapshotEvent>) {
            state.playlistId = action.payload.playlistId;
            state.songs = action.payload.songs;
        }
    },
});

export const { applyPlaylistOrder, setPlaylist } = playlistSlice.actions;
export default playlistSlice.reducer;
