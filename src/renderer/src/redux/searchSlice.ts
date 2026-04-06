import {createSlice, PayloadAction} from "@reduxjs/toolkit";


export interface SearchState {
    debouncedSearch: string;
}

const initialState: SearchState = {
    debouncedSearch: ""
}

const searchSlice = createSlice({
    name: "search",
    initialState,
    reducers: {
        setSearch: (state, action: PayloadAction<string>) => {
            state.debouncedSearch = action.payload;
        },

    }
});

export const { setSearch } = searchSlice.actions;
export default searchSlice.reducer;
