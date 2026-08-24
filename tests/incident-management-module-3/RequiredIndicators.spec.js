const { test, expect } = require("@playwright/test");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe("reporting form ,TC_UI_INC_REPORT_003  ", () => {
  test("2 not adding evidence description ", async ({
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

    await page.locator("//button[@id='B4742357481340896475']").click();

    await expect(page.getByText("Report New Incident" ,{ exact: false })).toBeVisible();

     await page
        .locator("//input[@id='P4020_INCIDENT_TITLE']")
        .fill("This is for testing purpose");

      //await page.waitForTimeout(1000);

      await page.locator("#P4020_INCIDENT_TYPE_NAME").selectOption({
        label: "Chemical Spill",
      });
      await page.waitForLoadState("networkidle");

      await page.locator("#P4020_SUBTYPE_NAME").selectOption({
        label: "Major Spill",
      });
      //await page.waitForTimeout(1000);

      await page.locator("//select[@id='P4020_SEVERITY_NAME']").selectOption({
        label: "High",
      });
      //await page.waitForTimeout(1000);

      await page.locator("//select[@id='P4020_PRIORITY_LEVEL']").selectOption({
        label: "High",
      });
      //await page.waitForTimeout(1000);

      await page.locator("//select[@id='P4020_SITE_ID']").selectOption({
        label: "ABC_SITE_1",
      });
      //await page.waitForTimeout(1000);

      await page.locator("//select[@id='P4020_OWNER_GROUP_ID']").selectOption({
        label: "Engineering",
      });
      //await page.waitForTimeout(1000);
      await page
        .locator("//textarea[@id='P4020_INCIDENT_DESCRIPTION']")
        .fill("This incident is being created for testing purpose");

      //await page.waitForTimeout(1000);

      // await page
      //   .locator("//textarea[@id='P4020_EVIDENCE_DESCRIPTION']")
      //   .fill("The evidence image will be uploded below ");

      // adding image

      const fileChooserPromise = page.waitForEvent("filechooser");

      await page.locator("//input[@id='mfu-input-P4020_INCIDENT_EVIDENCE_FILE']").click();

      const fileChooser = await fileChooserPromise;

      await fileChooser.setFiles("C:/Users/MOHAMMED ABUBAKER/Desktop/img1.jpg");


      //done adding image

      await page.locator("//span[normalize-space()='Create']").click();

      await page.locator("//button[normalize-space()='OK']").click();

      await page.waitForLoadState("networkidle");

      await expect(page.getByText("is required", {exact: false})).toBeVisible() ;

      await page.locator("//span[@class='t-Icon icon-close']").click();

      await page.waitForLoadState("networkidle");


  });
});
