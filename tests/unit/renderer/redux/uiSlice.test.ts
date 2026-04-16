import {describe, it, expect} from 'vitest';
import uiReducer, {setGlobalTheme, homepageToggleExpandedSection, UIState} from '@renderer/redux/uiSlice';
import {themeOptions} from '@shared/themeOptions';

describe('uiSlice', () => {
    const initialState: UIState = {
        theme: themeOptions[0],
        homepage: {
            expandedSections: {playlists: false, releases: false}
        }
    };

    it('should handle initial state', () => {
        expect(uiReducer(undefined, {type: 'unknown'})).toEqual(initialState);
    });

    it('should handle setGlobalTheme', () => {
        const nextTheme = themeOptions[1];
        const actual = uiReducer(initialState, setGlobalTheme(nextTheme));
        expect(actual.theme).toEqual(nextTheme);
    });

    it('should handle homepageToggleExpandedSection', () => {
        let actual = uiReducer(initialState, homepageToggleExpandedSection('playlists'));
        expect(actual.homepage.expandedSections.playlists).toBe(true);

        actual = uiReducer(actual, homepageToggleExpandedSection('playlists'));
        expect(actual.homepage.expandedSections.playlists).toBe(false);

        actual = uiReducer(initialState, homepageToggleExpandedSection('releases'));
        expect(actual.homepage.expandedSections.releases).toBe(true);
    });
});
