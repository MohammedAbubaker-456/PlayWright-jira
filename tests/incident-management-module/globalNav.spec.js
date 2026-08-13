const { test, expect } = require("@playwright/test");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe(" Global Navigation , TC_UI_INC_GLOBAL_001", () => {
  test("Login and open main navigation", async ({ page }) => {
    await page.goto(
      "https://157.20.214.83:8443/ords/r/corex10/soapboxcloud_landing_page/login?session&SESSION&tz=5:30",
    );

    await page.locator("#P9999_USERNAME").fill("alice@abc.com");

    await page.locator("#P9999_PASSWORD").fill("oracle");

    await page.locator("#B7616596710487751030").click();

    await page.locator("#B3441763390632703660").click();

    await expect(
      page.locator("//span[@class='fa fa fa-pie-chart']"),
    ).toBeVisible();

    await expect(
      page.locator("//span[@class='fa fa fa-bar-chart']"),
    ).toBeVisible();

    await expect(
      page.locator("//span[@class='fa fa fa-clock-o']"),
    ).toBeVisible();

    await expect(
      page.locator("//span[@class='fa fa fa-download']"),
    ).toBeVisible();

    await expect(
      page.locator("//span[@class='fa fa fa-users']"),
    ).toBeVisible();

    await expect(
      page.locator("//span[@class='fa fa fa-check-circle-o']"),
    ).toBeVisible();
  });
});
