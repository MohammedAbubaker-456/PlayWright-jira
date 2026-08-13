const { test, expect } = require("@playwright/test");
const data = require("../../utils/data.json");
const { checkRegions } = require("../regions");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe("Page Header, TC_UI_INC_GLOBAL_004 , 005 ,006 , 007 ", () => {
  test("Verify consistent page title format ", async ({ page }) => {
    await page.goto(
      "https://157.20.214.83:8443/ords/r/corex10/soapboxcloud_landing_page/login?session&SESSION&tz=5:30",
    );

    await page.locator("#P9999_USERNAME").fill("alice@abc.com");

    await page.locator("#P9999_PASSWORD").fill("oracle");

    await page.locator("#B7616596710487751030").click();

    await page.locator("button:has-text('Go To Module')").click();

    await page.waitForLoadState("networkidle");

    // Get test data
    for (const testData of data) {
      await page.locator(testData.iconToClick).click();
      await page.waitForLoadState("networkidle");

      for (const region of testData.regions) {
        await checkRegions(page, region);
      }

      // Verify page title

      await expect(page.locator(testData.pageHeaderLocator)).toContainText(
        testData.title,
      );

      // Verify expected action buttons
      for (const action of testData.expectedActions) {
        await expect(
          page.getByRole("button", { name: action, exact: true }),
        ).toBeVisible();
      }
    }
  });
});
