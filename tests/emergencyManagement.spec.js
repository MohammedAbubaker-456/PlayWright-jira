const { test, expect } = require("@playwright/test");
const LoginPage = require("../pages/loginpage");
const { ApexFormFiller } = require("../utils/apexFormFiller");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe(" testing dynamic code", () => {
  test("0506303 - testing dynamic code", async ({ page }) => {
    test.setTimeout(50000);
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");

    await page
      .locator("//span[@class='fa fa fa-exclamation-circle-o']")
      .click();

    await page.locator("//button[@id='B1597992772826461742']").click();

    await page.waitForLoadState("networkidle");

    const filler = new ApexFormFiller(page, {
      title: "This is for testing purpose (Abubaker)",
      description: "This incident is being created for testing purpose",
      filePath: "C:/Users/MOHAMMED ABUBAKER/Desktop/img1.jpg",
    });

    const issues = await filler.fillAll();
    if (issues.length) {
      console.warn("Field validation issues found:", issues);
    }

    // Clicks Submit, then fails the test if APEX shows an error alert
    await page.locator("button:has-text('Submit')").click();

    await page.waitForLoadState("networkidle");

    await filler.assertNoErrorAlert();

    await page.pause();
  });
});
