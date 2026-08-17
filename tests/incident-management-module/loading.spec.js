const { test, expect } = require("@playwright/test");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe("Page Header, TC_UI_INC_GLOBAL_004, 005, 006, 007", () => {
  test("Verify page header, regions, actions and badge colors", async ({
    page,
  }) => {
    // ------------------------------------------
    // LOGIN
    // ------------------------------------------

    await page.goto(
      "https://157.20.214.83:8443/ords/r/corex10/soapboxcloud_landing_page/login?session&SESSION&tz=5:30",
    );

    await page.locator("#P9999_USERNAME").fill("alice@abc.com");

    await page.locator("#P9999_PASSWORD").fill("oracle");

    await page.locator("#B7616596710487751030").click();

    await page.locator("button:has-text('Go To Module')").click();

    await page.waitForLoadState("networkidle");

    let logoloadersPage = [
      "//span[@class='fa fa fa-pie-chart']",
      "//span[@class='fa fa fa-bar-chart']",
      "//span[@class='fa fa fa-users']",
    //   "//span[@class='fa fa fa-clock-o']",
    //   "//span[@class='fa fa fa-clock-o']",
    ];

    for (let logo of logoloadersPage) {
      await page.locator(logo).click();

      await expect("//span[@class='u-Processing-spinner']").toBeVisible();

      await expect("//span[@class='u-Processing-spinner']").toBeHidden();
    }
  });
});
