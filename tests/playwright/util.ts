import {ElectronApplication, Locator, Page} from "playwright";
import {expect, test} from "@playwright/test";
import path from "path";
import {_electron as electron} from "playwright-core";

const root = path.join(import.meta.dirname, '..', '..');

export function prepareElectron() {
    const result: {app: ElectronApplication} = {app: null!};

    test.beforeAll(async () => {
        result.app = await electron.launch({
            args: ["."],
            cwd: root,
            env: {...process.env, NODE_ENV: "development", VITE_E2E: "true"}
        });
    })

    test.afterAll(async () => {
        await result.app.close();
    });
    return result;
}

export async function redirect(window: Page, path: string) {
    const url = new URL(window.mainFrame().url());
    url.hash = path;
    await window.goto(url.toString());
}

interface ExpectInputOptions {
    defaultValue?: string | RegExp;
    visible?: boolean;
    editable?: boolean;
    placeholder?: string;
    timeout?: number;
    inputType?: string
}

export async function expectInput(element: Locator, {defaultValue, visible, timeout, editable, placeholder, inputType}: ExpectInputOptions) {
    await expect(element).toBeVisible({visible});
    await expect(element).toBeEditable({editable});

    if(defaultValue)
        expect(await element.getAttribute("default-value", {timeout})).toMatch(defaultValue);

    if(placeholder)
        expect(await element.getAttribute("placeholder", {timeout})).toMatch(placeholder);

    if(inputType)
        expect(await element.getAttribute("type", {timeout})).toMatch(inputType);

}
