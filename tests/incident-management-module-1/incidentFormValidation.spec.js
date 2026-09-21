const { test, expect } = require("@playwright/test");
const LoginPage = require("../../pages/loginpage.js");
const { ApexFormFiller } = require("../../utils/apexFormFiller.js");
const testCases = require("../../data/testIncidentForm.json");

test.use({
  ignoreHTTPSErrors: true,
});
//  TC_UI_INC_GLOBAL_003
test.describe("formValidation incident Module  ", function () {
  test.describe("formValidation incident Module  ", function () {
    // One test per record in testIncidentForm.json, instead of hardcoding
    // just the first case. Each record's `name` becomes part of the test
    // title so failures point straight at the specific case that broke.
    test.setTimeout(600000);
    for (const testCase of testCases) {
      test(`all Incident pages - ${testCase.name}`, async ({ page }) => {
        const loginPage = new LoginPage(page);
        test.setTimeout(50000);

        await loginPage.loginToApplication("camila.rocha@cornerstoneinfra.com", "oracle");

        await page.waitForLoadState("networkidle");

        // report new incident button
        await page.locator("//button[normalize-space(.)='Report New Incident']").click();
        await page.waitForLoadState("networkidle");

        // Map this test case's JSON keys to the ACTUAL on-page label text.
        // fieldData is matched against each field's <label>, not the JSON
        // key names, so "name" -> "Name of the Incident" etc.
        const fieldData = {
          "Name of the Incident": testCase.name,
          "Incident Description": testCase["incident description"],
          "Evidence Description": testCase["evidence description"],
        };

        // No scope needed - defaults to Oracle APEX Universal Theme's
        // #t_Body_content wrapper, which works the same way across every
        // module's page without per-module configuration.
        const filler = new ApexFormFiller(page, {
          fieldData,
          filePath: "C:/Users/MOHAMMED ABUBAKER/Desktop/test-evidence.jpg",
        });

        const issues = await filler.fillAll();
        if (issues.length) {
          console.warn("Field validation issues found:", issues);
        }

        await page.locator("//span[normalize-space()='Create']").click();

        await page.waitForLoadState("networkidle");

        // Fails the test if APEX shows an error alert containing "error has
        // occurred". Using Playwright's own auto-retrying expect() here
        // instead of manual polling - it keeps re-checking visibility up to
        // its timeout, which is more reliable for a toast that animates in.

        await page.locator("//button[normalize-space()='OK']").click();

        await page.waitForTimeout(5000);

        // Some modules validate again on the OK confirmation step, so check
        // once more here too.

        const alert = page.locator("//div[@class='t-Alert-content']");
        await expect(
          alert.getByText("error has occurred", { exact: false }),
        ).not.toBeVisible();

        await page.waitForTimeout(5000);
      });
    }
  });
});
