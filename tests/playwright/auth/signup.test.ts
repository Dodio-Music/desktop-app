import {test, expect} from "@playwright/test";
import {expectInput, redirect,prepareElectron} from "../util.ts";

test.describe("Signup Flow", () => {
    const electron = prepareElectron();

    test("should navigate to signup page", async () => {
        const window = await electron.app.firstWindow();

        // Navigate to signup page
        await redirect(window, "/signup");
        console.log(window.url());

        // Check if signup page is loaded
        const title = window.getByTestId("signup-title");
        const username = window.getByTestId("signup-username");
        const email = window.getByTestId("signup-email");
        const password = window.getByTestId("signup-password");

        await title.waitFor({timeout: 100000});

        await expect(title).toHaveText("create", {ignoreCase: true});
        await expectInput(username, {});
        await expectInput(email, {});
        await expectInput(password, {inputType: "password"});

        await expect(window.locator('button[type="submit"]')).toContainText('Sign Up');
    });

    // test("should show validation errors for empty form submission", async () => {
    //     const window = await electron.app.firstWindow();
    //     await redirect(window, "/signup");
    //
    //
    //     // Try to submit empty form
    //     await window.click('button[type="submit"]');
    //
    //     // Should show validation errors (implementation depends on your validation logic)
    //     await expect(window.locator('input[placeholder="Username"]')).toBeVisible();
    // });
    //
    // test("should toggle password visibility", async () => {
    //     const window = await electron.app.firstWindow();
    //     await redirect(window, "/signup");
    //
    //
    //     const passwordInput = window.locator('input[placeholder="Password"]');
    //     const eyeButton = window.locator('.eyeButton');
    //
    //     // Initially password should be hidden
    //     await expect(passwordInput).toHaveAttribute('type', 'password');
    //
    //     // Click to show password
    //     await eyeButton.click();
    //     await expect(passwordInput).toHaveAttribute('type', 'text');
    //
    //     // Click to hide password
    //     await eyeButton.click();
    //     await expect(passwordInput).toHaveAttribute('type', 'password');
    // });
    //
    // test("should handle successful signup", async () => {
    //     const window = await electron.app.firstWindow();
    //     await redirect(window, "/signup");
    //
    //
    //     // Fill in signup form with unique data
    //     const timestamp = Date.now();
    //     const username = `testuser${timestamp}`;
    //     const email = `test${timestamp}@example.com`;
    //
    //     await window.fill('input[placeholder="Username"]', username);
    //     await window.fill('input[placeholder="Email"]', email);
    //     await window.fill('input[placeholder="Password"]', 'testpassword123');
    //
    //     // Submit form
    //     await window.click('button[type="submit"]');
    //
    //     // Should redirect to login page
    //     await window.waitForTimeout(2000);
    //     await expect(window.url()).toContain('/login');
    //
    //     // Should show success message
    //     // This depends on your toast implementation
    //     const toastExists = await window.locator('text=Successfully created account').count() > 0;
    //     if (toastExists) {
    //         await expect(window.locator('text=Successfully created account')).toBeVisible();
    //     }
    // });
    //
    // test("should handle signup error", async () => {
    //     const window = await electron.app.firstWindow();
    //     await redirect(window, "/signup");
    //
    //
    //     // Fill in data that might cause an error (existing email)
    //     await window.fill('input[placeholder="Username"]', 'existinguser');
    //     await window.fill('input[placeholder="Email"]', 'existing@example.com');
    //     await window.fill('input[placeholder="Password"]', 'testpassword123');
    //
    //     // Submit form
    //     await window.click('button[type="submit"]');
    //
    //     // Should show error message
    //     await window.waitForTimeout(1000);
    //
    //     // Check for error indicators
    //     const hasError = await window.locator('.error').count() > 0;
    //     if (hasError) {
    //         await expect(window.locator('.error')).toBeVisible();
    //     }
    // });
    //
    // test("should navigate to login page", async () => {
    //     const window = await electron.app.firstWindow();
    //     await redirect(window, "/signup");
    //
    //
    //     // Click login link
    //     await window.click('text=Log in');
    //
    //     // Should navigate to login page
    //     await expect(window.locator('h1')).toContainText('Log in to Dodio');
    //     await expect(window.locator('input[placeholder="Email / Username"]')).toBeVisible();
    // });
    //
    // test("should handle form submission with Enter key", async () => {
    //     const window = await electron.app.firstWindow();
    //     await redirect(window, "/signup");
    //
    //
    //     // Fill in form
    //     const timestamp = Date.now();
    //     await window.fill('input[placeholder="Username"]', `testuser${timestamp}`);
    //     await window.fill('input[placeholder="Email"]', `test${timestamp}@example.com`);
    //     await window.fill('input[placeholder="Password"]', 'testpassword123');
    //
    //     // Submit with Enter key
    //     await window.press('input[placeholder="Password"]', 'Enter');
    //
    //     // Should trigger form submission
    //     await window.waitForTimeout(2000);
    //
    //     // Check if navigation occurred
    //     await expect(window.url()).toContain('/login');
    // });
    //
    // test("should validate email format", async () => {
    //     const window = await electron.app.firstWindow();
    //     await redirect(window, "/signup");
    //
    //
    //     // Fill in invalid email
    //     await window.fill('input[placeholder="Username"]', 'testuser');
    //     await window.fill('input[placeholder="Email"]', 'invalid-email');
    //     await window.fill('input[placeholder="Password"]', 'testpassword123');
    //
    //     // Submit form
    //     await window.click('button[type="submit"]');
    //
    //     // Should show email validation error
    //     await window.waitForTimeout(1000);
    //
    //     // Check for email-specific error
    //     const emailError = await window.locator('.error').count() > 0;
    //     if (emailError) {
    //         await expect(window.locator('.error')).toBeVisible();
    //     }
    // });
    //
    // test("should validate password strength", async () => {
    //     const window = await electron.app.firstWindow();
    //     await redirect(window, "/signup");
    //
    //
    //     // Fill in weak password
    //     await window.fill('input[placeholder="Username"]', 'testuser');
    //     await window.fill('input[placeholder="Email"]', 'test@example.com');
    //     await window.fill('input[placeholder="Password"]', '123');
    //
    //     // Submit form
    //     await window.click('button[type="submit"]');
    //
    //     // Should show password validation error
    //     await window.waitForTimeout(1000);
    //
    //     // Check for password-specific error
    //     const passwordError = await window.locator('.error').count() > 0;
    //     if (passwordError) {
    //         await expect(window.locator('.error')).toBeVisible();
    //     }
    // });
    //
    // test("should disable submit button during submission", async () => {
    //     const window = await electron.app.firstWindow();
    //     await redirect(window, "/signup");
    //
    //
    //     // Fill in form
    //     const timestamp = Date.now();
    //     await window.fill('input[placeholder="Username"]', `testuser${timestamp}`);
    //     await window.fill('input[placeholder="Email"]', `test${timestamp}@example.com`);
    //     await window.fill('input[placeholder="Password"]', 'testpassword123');
    //
    //     // Submit form
    //     await window.click('button[type="submit"]');
    //
    //     // Button should be disabled during submission
    //     const submitButton = window.locator('button[type="submit"]');
    //     await expect(submitButton).toHaveClass(/buttonActive/);
    // });
    //
    // test("should handle exit click outside form", async () => {
    //     const window = await electron.app.firstWindow();
    //     await redirect(window, "/signup");
    //
    //
    //     // Click outside the form area (on the page background)
    //     await window.click('.page', {position: {x: 10, y: 10}});
    //
    //     // Should navigate back (this depends on your navigation logic)
    //     await window.waitForTimeout(500);
    //
    //     // Check if we navigated away from signup
    //     const currentUrl = window.url();
    //     // This test might need adjustment based on your actual navigation behavior
    // });
});
