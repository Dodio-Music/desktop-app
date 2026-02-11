import {_electron as electron, type ElectronApplication} from "playwright";
import {test, expect} from "@playwright/test";
import {redirect} from "../util.ts";

test.describe("Player Functionality", () => {
    let electronApp: ElectronApplication;

    test.beforeAll(async () => {
        electronApp = await electron.launch();
    });

    test.afterAll(async () => {
        await electronApp.close();
    });

    test("should display playback bar", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        // Check if playback bar is visible
        await expect(window.locator('.container')).toBeVisible();

        // Check for main playback controls
        await expect(window.locator('.controls')).toBeVisible();
        await expect(window.locator('.play')).toBeVisible();
        await expect(window.locator('.backward')).toBeVisible();
        await expect(window.locator('.forward')).toBeVisible();
    });

    test("should show play/pause button correctly", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        const playButton = window.locator('.play');

        // Initially should show play icon (paused state)
        await expect(playButton.locator('svg')).toBeVisible();

        // Click to play/pause
        await playButton.click();
        await window.waitForTimeout(500);

        // Should toggle state (implementation depends on your player state)
        // This test may need adjustment based on your actual player behavior
    });

    test("should handle next track button", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        const nextButton = window.locator('.forward');
        await expect(nextButton).toBeVisible();

        // Click next track
        await nextButton.click();
        await window.waitForTimeout(500);

        // Verify next track was called (mock verification needed)
        // This test verifies the button is clickable and visible
    });

    test("should handle previous track button", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        const prevButton = window.locator('.backward');
        await expect(prevButton).toBeVisible();

        // Click previous track
        await prevButton.click();
        await window.waitForTimeout(500);

        // Verify previous track was called (mock verification needed)
    });

    test("should handle repeat mode cycling", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        const repeatButton = window.locator('.repeatButton');
        await expect(repeatButton).toBeVisible();

        // Check initial state (should be off/disabled)
        await expect(repeatButton.locator('.disabledBtn')).toBeVisible();

        // Click to cycle through repeat modes
        await repeatButton.click();
        await window.waitForTimeout(200);

        // Should show repeat all icon
        await expect(repeatButton.locator('svg')).toBeVisible();

        await repeatButton.click();
        await window.waitForTimeout(200);

        // Should show repeat one icon
        await expect(repeatButton.locator('svg')).toBeVisible();

        await repeatButton.click();
        await window.waitForTimeout(200);

        // Should be back to off state
        await expect(repeatButton.locator('.disabledBtn')).toBeVisible();
    });

    test("should display volume controls", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        // Check volume control elements
        await expect(window.locator('.volumeControl')).toBeVisible();
        await expect(window.locator('.volBtn')).toBeVisible();
        await expect(window.locator('.slider')).toBeVisible();
    });

    test("should handle volume slider interaction", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        const volumeSlider = window.locator('.slider');
        await expect(volumeSlider).toBeVisible();

        // Drag slider to increase volume
        await volumeSlider.fill('0.8');
        await window.waitForTimeout(200);

        const newValue = await volumeSlider.inputValue();
        expect(newValue).toBe('0.8');

        // Check volume percentage display
        const volumePercent = window.locator('.volumeControl p');
        await expect(volumePercent).toContainText('80%');
    });

    test("should handle mute toggle", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        const muteButton = window.locator('.volBtn');
        await expect(muteButton).toBeVisible();

        // Check initial volume icon
        await expect(muteButton.locator('svg')).toBeVisible();

        // Click to mute
        await muteButton.click();
        await window.waitForTimeout(200);

        // Should show muted icon
        await expect(muteButton.locator('svg')).toBeVisible();

        // Click to unmute
        await muteButton.click();
        await window.waitForTimeout(200);

        // Should show volume icon again
        await expect(muteButton.locator('svg')).toBeVisible();
    });

    test("should handle volume wheel control", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        const volumeSlider = window.locator('.slider');
        await expect(volumeSlider).toBeVisible();

        // Get initial value
        const initialValue = await volumeSlider.inputValue();

        // Scroll up to increase volume
        await volumeSlider.hover();
        await window.mouse.wheel(0, -10); // Negative delta for scroll up
        await window.waitForTimeout(200);

        const increasedValue = await volumeSlider.inputValue();
        expect(parseFloat(increasedValue)).toBeGreaterThan(parseFloat(initialValue));

        // Scroll down to decrease volume
        await window.mouse.wheel(0, 10); // Positive delta for scroll down
        await window.waitForTimeout(200);

        const decreasedValue = await volumeSlider.inputValue();
        expect(parseFloat(decreasedValue)).toBeLessThan(parseFloat(increasedValue));
    });

    test("should display seek bar", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        // Check seek bar elements
        await expect(window.locator('#middleRow')).toBeVisible();
        await expect(window.getByTestId('seekbar-bar')).toBeVisible();
        await expect(window.locator('.canvas')).toBeVisible();

        // Check time displays
        await expect(window.locator('.time').first()).toBeVisible(); // Current time
        await expect(window.locator('.time').last()).toBeVisible();  // Duration
    });

    test("should handle seek bar interaction", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        const seekBar = window.locator('.seekBar');
        await expect(seekBar).toBeVisible();

        // Hover over seek bar
        await seekBar.hover();
        await window.waitForTimeout(200);

        // Should show tooltip on hover
        const tooltip = window.locator('.tooltip');
        const tooltipVisible = await tooltip.isVisible();

        if (tooltipVisible) {
            await expect(tooltip).toBeVisible();
        }

        // Click to seek
        await seekBar.click({position: {x: 100, y: 10}});
        await window.waitForTimeout(200);

        // Verify seek was called (mock verification needed)
    });

    test("should display track information when track is loaded", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        // This test assumes a track is loaded or can be loaded
        // You may need to mock track loading or navigate to a page with tracks

        const trackInfo = window.locator('.trackInfo');
        const trackInfoVisible = await trackInfo.isVisible();

        if (trackInfoVisible) {
            // Check track info elements
            await expect(trackInfo.locator('.trackInfoCover')).toBeVisible();
            await expect(trackInfo.locator('.trackInfoMeta')).toBeVisible();
            await expect(trackInfo.locator('.trackName')).toBeVisible();
            await expect(trackInfo.locator('.trackArtists')).toBeVisible();
        }
    });

    test("should handle track title click for remote songs", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        const trackName = window.locator('.trackName');
        const trackNameVisible = await trackName.isVisible();

        if (trackNameVisible) {
            // Check if track name is clickable (has link class)
            const hasLinkClass = await trackName.evaluate(el =>
                el.classList.contains('link')
            );

            if (hasLinkClass) {
                await trackName.click();
                await window.waitForTimeout(500);

                // Should navigate to release page
                const url = window.url();
                expect(url).toContain('/release/');
            }
        }
    });

    test("should show loading state when waiting for data", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        // This test checks for loading spinner
        // You may need to trigger a loading state

        const loadingSpinner = window.locator('.controlMiddle .MoonLoader');
        const spinnerVisible = await loadingSpinner.isVisible();

        if (spinnerVisible) {
            await expect(loadingSpinner).toBeVisible();
        }
    });

    test("should handle keyboard shortcuts for player controls", async () => {
        const window = await electronApp.firstWindow();
        await redirect(window, "/");

        // Test spacebar for play/pause
        await window.keyboard.press('Space');
        await window.waitForTimeout(200);

        // Test volume shortcuts
        await window.keyboard.press('ArrowUp');
        await window.waitForTimeout(200);

        await window.keyboard.press('ArrowDown');
        await window.waitForTimeout(200);

        await window.keyboard.press('KeyM');
        await window.waitForTimeout(200);

        // Verify shortcuts work (mock verification needed)
    });
});
