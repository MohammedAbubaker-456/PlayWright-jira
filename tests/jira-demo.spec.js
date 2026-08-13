const { test, expect } = require("@playwright/test");

test("Login test - Jira integration", async ({ page }) => {

    await page.goto(
        "https://freelance-learn-automation.vercel.app/login"
    );

    await expect(
        page.getByText("This text does not exist")
    ).toBeVisible();

});