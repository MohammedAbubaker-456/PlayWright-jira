const { test, expect } = require("@playwright/test");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe("no incident found message", () => {
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

    await page.locator("//span[@class='fa fa fa-pie-chart']").click();

    await page.locator("//select[@id='P4010_SEVERITY']").selectOption("Medium");

    await page.locator("//select[@id='P4010_STATUS']").selectOption("Closed");

    await page
      .locator("//select[@id='P4010_ASSIGNED_USER']")
      .selectOption("bilal");

    await page.locator("//button[@id='B4908900777775450890']").click();

    await expect(page.getByText("No incidents found")).toBeVisible();
  });
});
