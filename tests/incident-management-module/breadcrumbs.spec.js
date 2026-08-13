const { test, expect } = require("@playwright/test");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe("breadcrumbs , TC_UI_INC_GLOBAL_003 ", function () {
  test.describe("Verify breadcrumb ", function () {
    test("all Incident pages  ", async ({ page }) => {
      await page.goto(
        "https://157.20.214.83:8443/ords/r/corex10/soapboxcloud_landing_page/login?session&SESSION&tz=5:30",
      );

      // this is email
      await page.locator("//input[@id='P9999_USERNAME']").fill("alice@abc.com");

      // this is password
      await page.locator("//input[@id='P9999_PASSWORD']").fill("oracle");

      // signin button
      await page.locator("button:has-text('Sign In')").click();

      //go to module button
      await page.locator("button:has-text('Go To Module')").click();
      await page.waitForLoadState("networkidle");

      await page.locator("//span[@class='fa fa fa-bar-chart']").click();
      await page.waitForTimeout(1000);

      await page.locator("//span[@class='fa fa fa-clock-o']").click();
      await page.waitForTimeout(1000);

      await page.locator("//span[@class='fa fa fa-download']").click();
      await page.waitForTimeout(1000);

      await page.locator("//span[@class='fa fa fa-users']").click();
      await page.waitForTimeout(1000);

      await page.locator("//span[@class='fa fa fa-check-circle-o']").click();
      await page.waitForTimeout(1000);

      await page.locator("//span[@class='fa fa fa-pie-chart']").click();
      await page.waitForTimeout(1000);

      //report new incident button
      await page.locator("(//button[@id='B4742357481340896475'])[1]").click();

      await page.waitForLoadState("networkidle");

      await page
        .locator("//input[@id='P4020_INCIDENT_TITLE']")
        .fill("This is for testing purpose (Abubaker)");

      await page.locator("#P4020_INCIDENT_TYPE_NAME").selectOption({
        label: "Chemical Spill",
      });
      await page.waitForLoadState("networkidle");

      await page.locator("#P4020_SUBTYPE_NAME").selectOption({
        label: "Major Spill",
      });

      await page.locator("//select[@id='P4020_SEVERITY_NAME']").selectOption({
        label: "High",
      });

      await page.locator("//select[@id='P4020_PRIORITY_LEVEL']").selectOption({
        label: "High",
      });

      await page.locator("//select[@id='P4020_SITE_ID']").selectOption({
        label: "ABC_SITE_1",
      });

      await page.locator("//select[@id='P4020_OWNER_GROUP_ID']").selectOption({
        label: "Engineering",
      });
      await page
        .locator("//textarea[@id='P4020_INCIDENT_DESCRIPTION']")
        .fill("This incident is being created for testing purpose");

      await page
        .locator("//textarea[@id='P4020_EVIDENCE_DESCRIPTION']")
        .fill("The evidence image will be uploded below ");

      // adding image

      const fileChooserPromise = page.waitForEvent("filechooser");

      await page
        .locator("//input[@id='mfu-input-P4020_INCIDENT_EVIDENCE_FILE']")
        .click();

      const fileChooser = await fileChooserPromise;

      await fileChooser.setFiles("C:/Users/MOHAMMED ABUBAKER/Desktop/img1.jpg");

      await page.waitForTimeout(1000);

      await page.locator("//span[normalize-space()='Create']").click();

      await page.locator("//button[normalize-space()='OK']").click();

      await page.waitForLoadState("networkidle");

      await page.locator("//span[@class='t-Icon icon-close']").click();
    });
  });
});
