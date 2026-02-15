import {createSlice, PayloadAction} from "@reduxjs/toolkit";

type Section = "releases" | "playlists";
interface HomepageUI {
    expandedSections: Record<Section, boolean>;
}

export interface UIState {
    homepage: HomepageUI;
}

const initialState: UIState = {
    homepage: {
        expandedSections: {playlists: false, releases: false}
    }
}

const uiSlice = createSlice({
    name: "ui",
    initialState,
    reducers: {
        homepageToggleExpandedSection: (state, action: PayloadAction<Section>) => {
            state.homepage.expandedSections[action.payload] = !state.homepage.expandedSections[action.payload];
        }
    }
});

export const { homepageToggleExpandedSection} = uiSlice.actions;
export default uiSlice.reducer;
