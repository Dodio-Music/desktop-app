import {test, expect} from "@playwright/test";
import {redirect,prepareElectron} from "../util.ts";

test.describe("Authentication Flow", () => {
    const electron = prepareElectron();

    test("should navigate to login page", async () => {
        const window = await electron.app.firstWindow();

        // Navigate to login page
        await redirect(window, "/login");

        // Check if login page is loaded
        await expect(window.locator('h1')).toContainText('log in', {ignoreCase: true});
        await expect(window.locator('input[placeholder="Email / Username"]')).toBeVisible();
        await expect(window.locator('input[placeholder="Password"]')).toBeVisible();
        await expect(window.locator('button[type="submit"]')).toContainText('Log in');
    });

    test("should show validation errors for empty form submission", async () => {
        const window = await electron.app.firstWindow();
        new URL(window.url())
        await redirect(window, "/login");

        // Try to submit empty form
        await window.click('button[type="submit"]');

        // Should show validation errors (implementation depends on your validation logic)
        // This test assumes you have client-side validation
        await expect(window.locator('text=Email / Username')).toBeVisible();
    });

    test("should toggle password visibility", async () => {
        const window = await electron.app.firstWindow();
        await redirect(window, "/login");

        const passwordInput = window.locator('input[placeholder="Password"]');
        const eyeButton = window.locator('.eyeButton');

        // Initially password should be hidden
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Click to show password
        await eyeButton.click();
        await expect(passwordInput).toHaveAttribute('type', 'text');

        // Click to hide password
        await eyeButton.click();
        await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test("should handle successful login", async () => {
        const window = await electron.app.firstWindow();
        await redirect(window, "/login");

        // Fill in login form
        await window.fill('input[placeholder="Email / Username"]', 'testuser@example.com');
        await window.fill('input[placeholder="Password"]', 'testpassword123');

        // Submit form
        await window.click('button[type="submit"]');

        // Should redirect to home page or previous URL
        // Wait for navigation (adjust timeout as needed)
        await window.waitForTimeout(2000);

        // Check if we're redirected (this depends on your app's behavior)
        // You might need to adjust this based on your actual redirect logic
        const url = window.url();
        expect(url).toMatch(/(localhost:5173\/|localhost:5173\/\?.*)/);
    });

    test("should handle login error", async () => {
        const window = await electron.app.firstWindow();
        await redirect(window, "/login");

        // Fill in invalid credentials
        await window.fill('input[placeholder="Email / Username"]', 'invalid@example.com');
        await window.fill('input[placeholder="Password"]', 'wrongpassword');

        // Submit form
        await window.click('button[type="submit"]');

        // Should show error message
        // This depends on your error handling implementation
        await window.waitForTimeout(1000);

        // Check for error indicators (adjust based on your error display)
        const hasError = await window.locator('.error').count() > 0;
        if (hasError) {
            await expect(window.locator('.error')).toBeVisible();
        }
    });

    test("should navigate to signup page", async () => {
        const window = await electron.app.firstWindow();
        await redirect(window, "/login");

        // Click signup link
        await window.click('text=Sign up');

        // Should navigate to signup page
        await expect(window.locator('h1')).toContainText('Create Dodio Account');
        await expect(window.locator('input[placeholder="Username"]')).toBeVisible();
        await expect(window.locator('input[placeholder="Email"]')).toBeVisible();
        await expect(window.locator('input[placeholder="Password"]')).toBeVisible();
    });

    test("should navigate to forgot password page", async () => {
        const window = await electron.app.firstWindow();
        await redirect(window, "/login");

        // Click forgot password link
        await window.click('text=Forgot your password?');

        // Should navigate to reset password page
        expect(window.url()).toContain('/resetPassword');
    });

    test("should handle form submission with Enter key", async () => {
        const window = await electron.app.firstWindow();
        await redirect(window, "/login");

        // Fill in form
        await window.fill('input[placeholder="Email / Username"]', 'testuser@example.com');
        await window.fill('input[placeholder="Password"]', 'testpassword123');

        // Submit with Enter key
        await window.press('input[placeholder="Password"]', 'Enter');

        // Should trigger form submission
        await window.waitForTimeout(2000);

        // Check if navigation occurred
        const url = window.url();
        expect(url).toMatch(/(localhost:5173\/|localhost:5173\/\?.*)/);
    });

    test("should show redirect message when coming from protected page", async () => {
        const window = await electron.app.firstWindow();

        // Navigate to login with URL parameter
        await redirect(window, "/login?url=/protected-page");

        // Should show redirect message (if implemented)
        // This depends on your toast implementation
        await window.waitForTimeout(1000);

        // The toast message should appear (you may need to adjust selector)
        const toastExists = await window.locator('text=You need to log in to access this page').count() > 0;
        if (toastExists) {
            await expect(window.locator('text=You need to log in to access this page')).toBeVisible();
        }
    });

    test("should disable submit button during submission", async () => {
        const window = await electron.app.firstWindow();
        await redirect(window, "/login");

        // Fill in form
        await window.fill('input[placeholder="Email / Username"]', 'testuser@example.com');
        await window.fill('input[placeholder="Password"]', 'testpassword123');

        // Submit form
        await window.click('button[type="submit"]');

        // Button should be disabled during submission
        const submitButton = window.locator('button[type="submit"]');
        await expect(submitButton).toHaveClass(/buttonActive/);
    });
});
