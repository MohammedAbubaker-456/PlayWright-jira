const { test, expect } = require("@playwright/test");
const LoginPage = require("../pages/LoginPage");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe(" Global Navigation , TC_UI_INC_GLOBAL_002", () => {
  test("Login and open main navigation", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracleeee");

    // await expect(page.locator("//div[@class='t-Alert-content']")).toHaveTitle(
    //   "Invalid Login Credentials",
    // );

    await expect(page.getByText("Invalid Login Credentials")).toBeVisible();
  });
});
