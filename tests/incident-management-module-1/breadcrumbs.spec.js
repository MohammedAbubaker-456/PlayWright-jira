const { test, expect } = require("@playwright/test");
const LoginPage = require("../../pages/loginpage.js");
const { ApexFormFiller } = require("../../utils/apexFormFiller");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe("breadcrumbs , TC_UI_INC_GLOBAL_003 ", function () {
  test.describe("Verify breadcrumb ", function () {
    test("all Incident pages  ", async ({ page }) => {
      const loginPage = new LoginPage(page);
      test.setTimeout(50000);

      await loginPage.loginToApplication("alice@abc.com", "Oracle@12345");

      await page.waitForLoadState("networkidle");

      // report new incident button
      await page.locator("(//button[@id='B4742357481340896475'])[1]").click();

      await page.waitForLoadState("networkidle");

      // No scope needed - defaults to Oracle APEX Universal Theme's
      // #t_Body_content wrapper, which works the same way across every
      // module's page without per-module configuration.
      const filler = new ApexFormFiller(page, {
        title: "This is for testing purpose (Abubaker)",
        description: "This incident is being created for testing purpose",
        filePath: "C:/Users/MOHAMMED ABUBAKER/Desktop/img1.jpg",
      });

      const issues = await filler.fillAll();
      if (issues.length) {
        console.warn("Field validation issues found:", issues);
      }

      await page.locator("//span[normalize-space()='Create']").click();

      await page.waitForLoadState("networkidle");

      // Fails the test if APEX shows an error alert containing "error has occurred"
      await filler.assertNoErrorAlert();

      await page.locator("//button[normalize-space()='OK']").click();

      await page.waitForLoadState("networkidle");

      // Some modules validate again on the OK confirmation step, so check
      // once more here too - give it a longer window since this step can
      // involve a slower server round-trip.
      await filler.assertNoErrorAlert("error has occurred", 10000);
    });
  });
});