const { test, expect } = require("@playwright/test");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe(" Global Navigation , TC_UI_INC_GLOBAL_002", () => {
  test("Login and open main navigation", async ({ page }) => {
    await page.goto(
      "https://157.20.214.83:8443/ords/r/corex10/soapboxcloud_landing_page/login?session&SESSION&tz=5:30",
    );

    await page.locator("#P9999_USERNAME").fill("alice@abc.com");

    await page.locator("#P9999_PASSWORD").fill("wrong password");

    await page.locator("#B7616596710487751030").click();

    await page.waitForLoadState("networkidle");

    // await expect(page.locator("//div[@class='t-Alert-content']")).toHaveTitle(
    //   "Invalid Login Credentials",
    // );

    await expect(page.getByText("Invalid Login Credentials")).toBeVisible();
  });
});
