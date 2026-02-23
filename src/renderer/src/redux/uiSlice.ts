import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {Theme, themeOptions} from "../../../shared/themeOptions";

type Section = "releases" | "playlists";
interface HomepageUI {
    expandedSections: Record<Section, boolean>;
}

export interface UIState {
    theme: Theme;
    homepage: HomepageUI;
}

const initialState: UIState = {
    theme: themeOptions[0],
    homepage: {
        expandedSections: {playlists: false, releases: false}
    }
}

const uiSlice = createSlice({
    name: "ui",
    initialState,
    reducers: {
        setGlobalTheme: (state, action: PayloadAction<Theme>) => {
            state.theme = action.payload;
        },
        homepageToggleExpandedSection: (state, action: PayloadAction<Section>) => {
            state.homepage.expandedSections[action.payload] = !state.homepage.expandedSections[action.payload];
        }
    }
});

export const { homepageToggleExpandedSection, setGlobalTheme } = uiSlice.actions;
export default uiSlice.reducer;
