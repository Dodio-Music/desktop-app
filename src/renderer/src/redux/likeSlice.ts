import {createAsyncThunk, createSlice, PayloadAction} from "@reduxjs/toolkit";
import {LikedItemsDTO} from "../../../shared/Api";

export const fetchLikedState = createAsyncThunk(
    "like/init",
    async () => {
        return await window.api.authRequest<LikedItemsDTO>("get", "/like");
    }
);

export interface LikeState {
    initialized: boolean;
    likedPlaylists: Record<number, true>;
    likedTracks: Record<string, true>;
    likedReleases: Record<string, true>;
    followedArtists: Record<number, true>;
}

const initialState: LikeState = {
    initialized: false,
    likedPlaylists: {},
    likedTracks: {},
    likedReleases: {},
    followedArtists: {}
};

const likes = createSlice({
    name: "likes",
    initialState,
    reducers: {
        resetLikes(state) {
            state.initialized = false;
            state.likedPlaylists = {};
            state.likedTracks = {};
            state.likedReleases = {};
            state.followedArtists = {};
        },
        likeTrack(state, action: PayloadAction<string>) {
            state.likedTracks[action.payload] = true;
        },
        unlikeTrack(state, action: PayloadAction<string>) {
            delete state.likedTracks[action.payload];
        },
        setLikedTracks(state, action: PayloadAction<string[]>) {
            state.likedTracks = Object.fromEntries(action.payload.map(id => [id, true]));
        },
        likeRelease(state, action: PayloadAction<string>) {
            state.likedReleases[action.payload] = true;
        },
        unlikeRelease(state, action: PayloadAction<string>) {
            delete state.likedReleases[action.payload];
        },
        setLikedReleases(state, action: PayloadAction<string[]>) {
            state.likedReleases = Object.fromEntries(action.payload.map(id => [id, true]));
        },
        likePlaylist(state, action: PayloadAction<number>) {
            state.likedPlaylists[action.payload] = true;
        },
        unlikePlaylist(state, action: PayloadAction<number>) {
            delete state.likedPlaylists[action.payload];
        },
        setFollowedArtists(state, action: PayloadAction<number[]>) {
            state.followedArtists = Object.fromEntries(action.payload.map(id => [id, true]));
        },
        followArtist(state, action: PayloadAction<number>) {
            state.followedArtists[action.payload] = true;
        },
        unfollowArtist(state, action: PayloadAction<number>) {
            delete state.followedArtists[action.payload];
        }
    },
    extraReducers: (builder) => {
        builder.addCase(fetchLikedState.fulfilled, (state, action) => {
            if(action.payload.type === "ok") {
                const entries = action.payload.value;
                state.likedTracks = Object.fromEntries(entries.likedTracks.map(id => [id, true]));
                state.likedReleases = Object.fromEntries(entries.likedReleases.map(id => [id, true]));
                state.likedPlaylists = Object.fromEntries(entries.likedPlaylists.map(id => [id, true]));
                state.followedArtists = Object.fromEntries(entries.followedArtists.map(id => [id, true]));
                state.initialized = true;
            }
        });
    }
});

export const {resetLikes, unlikeTrack, likeTrack, setLikedTracks, likeRelease, unlikeRelease, setLikedReleases, likePlaylist, unlikePlaylist, followArtist, unfollowArtist, setFollowedArtists} = likes.actions;

export default likes.reducer;
