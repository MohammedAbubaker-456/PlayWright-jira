const { test, expect } = require("@playwright/test");

const data = require("../../utils/data.json");
const badgeColors = require("../../utils/badgeColor.json");

const { checkRegions } = require("../regions");
const { checkBadgeColor } = require("../../utils/badgeColors");

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

    // ------------------------------------------
    // LOOP THROUGH MODULES
    // ------------------------------------------

    for (const testData of data) {
      await page.locator(testData.iconToClick).click();

      // await page.waitForLoadState("networkidle");

      // ------------------------------------------
      // REGION VALIDATION
      // ------------------------------------------

      for (const region of testData.regions) {
        await checkRegions(page, region);
      }

      // ------------------------------------------
      // PAGE TITLE
      // ------------------------------------------

      await expect(page.locator(testData.pageHeaderLocator)).toContainText(
        testData.title,
      );

      await page.waitForLoadState("networkidle");

      // ------------------------------------------
      // ACTION BUTTONS
      // ------------------------------------------

      for (const action of testData.expectedActions) {
        await expect(
          page.getByRole("button", {
            name: action,
            exact: true,
          }),
        ).toBeVisible();
      }

      // ------------------------------------------
      // STATUS BADGE COLORS
      // ------------------------------------------

      for (const [status, colors] of Object.entries(badgeColors.statusBadges)) {
        await checkBadgeColor(
          page,
          status,
          colors.backgroundColor,
          colors.textColor,
        );
      }

      // ------------------------------------------
      // PRIORITY BADGE COLORS
      // ------------------------------------------

      for (const [priority, colors] of Object.entries(
        badgeColors.priorityBadges,
      )) {
        await checkBadgeColor(
          page,
          priority,
          colors.backgroundColor,
          colors.textColor,
        );
      }
    }
  });
});
