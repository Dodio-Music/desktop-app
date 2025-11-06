import {_electron as electron} from "playwright";
import {test, expect, ElectronApplication, Page} from "@playwright/test";

test.describe("Playwright", async () => {
    let electronApp: ElectronApplication;
    let firstWindow: Page;

    test.beforeAll(async () => {
        electronApp = await electron.launch({args: ["."]});
        firstWindow = await electronApp.firstWindow();
    });

    test("Electron app launched", async () => {
        const windowState = await electronApp.evaluate<{
            isVisible: boolean,
            isDevToolsOpened: boolean,
            isCrashed: boolean
        }>(async ({BrowserWindow}) => {
            const mainWindow = BrowserWindow.getAllWindows()[0];

            const getState = () => ({
                isVisible: mainWindow.isVisible(),
                isDevToolsOpened: mainWindow.webContents.isDevToolsOpened(),
                isCrashed: mainWindow.webContents.isCrashed(),
            });
            if (mainWindow.isVisible()) return getState();

            return new Promise((resolve) => {
                mainWindow.once("ready-to-show", () =>
                    setTimeout(() => resolve(getState()), 0)
                );
            });
        });
        expect(windowState.isVisible).toBeTruthy();
        expect(windowState.isDevToolsOpened).toBeFalsy();
        expect(windowState.isCrashed).toBeFalsy();
    })

    test.afterAll(async () => {
        await electronApp.close();
    })
})
