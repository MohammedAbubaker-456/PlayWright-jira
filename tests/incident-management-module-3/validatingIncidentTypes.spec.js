const { test, expect } = require("@playwright/test");
const LoginPage = require("../../pages/loginpage");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe(" Incident Reporting Page UI Test Cases ", () => {
  test.skip("TC_UI_INC_REPORT_001 - verify form sections", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");

    await page.locator("//button[@id='B4742357481340896475']").click();

    await expect(
      page.getByText("Report New Incident", { exact: false }),
    ).toBeVisible();
  });

  test.skip("TC_UI_INC_REPORT_002 ", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");

    await page.locator("//button[@id='B4742357481340896475']").click();

    const expectedOptions = [
      "Air Quality INdex",
      "Air pollution",
      "Chemical Exposure",
      "Chemical Spill",
      "Compliance Incident",
      "Confined Space Incident",
      "Data Breach",
      "Electrical Hazard",
      "Environmental Hazard",
      "Environmental Incident",
      "Equipment Failure",
      "Ergonomic Incident",
      "Explosion",
      "Fire Incident",
      "Fraud Incident",
      "Hazard",
      "IT Incident",
      "Injury",
      "Natural Disaster",
      "Near Miss",
      "Operational Incident",
      "Other",
      "Power Outage",
      "Public Safety Incident",
      "Quality Incident",
      "Safety Violation",
      "Security Incident",
      "Slip, Trip and Fall",
      "Spill/Leak",
      "Structural Damage",
      "Vehicle Accident",
      "Workplace Injury",
      "Workplace Violence",
      "data delete unknowingly",
      "hazardous substance movement",
      "humidity",
      "pollution",
      "soil pollution",
      "test",
      "water pollution",
    ];

    for (const expectedOption of expectedOptions) {
      const options = await page
        .locator("#P4020_INCIDENT_TYPE_NAME option")
        .allTextContents();

      const matchingOptions = options.filter(
        (actualOption) =>
          actualOption.trim().replace(/\s+/g, " ") ===
          expectedOption.trim().replace(/\s+/g, " "),
      );

      expect(matchingOptions).toHaveLength(1);
    }

    const severityOptions = [
      "Critical",
      "High",
      "Informational",
      "Low",
      "Medium",
    ];

    for (const expectedSeverity of severityOptions) {
      const options = await page
        .locator("//select[@id='P4020_SEVERITY_NAME'] //option")
        .allTextContents();

      const matchingOptions = options.filter(
        (actualOption) =>
          actualOption.trim().replace(/\s+/g, " ") ===
          expectedSeverity.trim().replace(/\s+/g, " "),
      );

      expect(matchingOptions).toHaveLength(1);
    }

    const siteOptions = [
      "ABC_SITE_1",
      "CHARMINAR, HYDERABAD, INDIA",
      "GOLF COURSE, BENGALURU, INDIA",
      "PARK AVE, NEW YORK CITY, USA",
    ];

    const siteDropdown = page.locator("#P4020_SITE_ID");

    for (const expectedSite of siteOptions) {
      const normalizedSite = expectedSite.trim().replace(/\s+/g, " ");

      // Verify the site occurs exactly once in the dropdown
      const options = await siteDropdown.locator("option").allTextContents();

      const matchingSites = options.filter(
        (actualSite) =>
          actualSite.trim().replace(/\s+/g, " ") === normalizedSite,
      );

      expect(matchingSites).toHaveLength(1);

      // Select the site
      await siteDropdown.selectOption({ label: normalizedSite });

      // Verify the selected site is visible/selected
      await expect(siteDropdown.locator("option:checked")).toHaveText(
        normalizedSite,
      );
    }
  });

  test.skip("TC_UI_INC_REPORT_003 ", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");

    await page.locator("//button[@id='B4742357481340896475']").click();

    await page
      .locator("//input[@id='P4020_INCIDENT_TITLE']")
      .fill("This is for testing purpose");

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

    //done adding image
    await page.waitForLoadState("networkidle");

    const createBtn = await page.locator("//span[normalize-space()='Create']");

    console.log("Count:", await createBtn.count());
    console.log("Visible:", await createBtn.isVisible());
    console.log("Enabled:", await createBtn.isEnabled());

    await createBtn.click();

    await page.waitForLoadState("networkidle");
    const dialog = page.locator(".ui-dialog:visible");

    await dialog.waitFor({ state: "visible" });

    console.log("Confirmation:", await dialog.innerText());

    await dialog.getByRole("button", { name: "OK", exact: true }).click();

    const okButton = page.locator("button.js-confirmBtn").click();
    await okButton.click();
    await expect(
      page.getByText("error has occured", { exact: false }),
    ).toBeVisible();

    // await page.locator("//span[@class='t-Icon icon-close']").click();

    await page.waitForLoadState("networkidle");
  });

  test("TC_UI_INC_REPORT_008", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");

    // From date > To date
    await page
      .locator("//input[@id='P4010_DATE_FROM_input']")
      .fill("8/27/2026");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.locator("//input[@id='P4010_DATE_TO_input']").fill("8/26/2026");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    // Apply Filter
    await page.locator("//button[@id='B4908900777775450890']").click();

    await page.waitForTimeout(3000);

    // Check entire page for "error"
    const container = page.locator(
      "//div[@class='a-Notification-title aErrMsgTitle']",
    );
    await expect(container.getByText("error", { exact: false })).toBeVisible();
  });

  test.skip("TC_UI_INC_REPORT_010 - entering long description", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");

    await page.locator("//button[@id='B4742357481340896475']").click();

    await page
      .locator("//input[@id='P4020_INCIDENT_TITLE']")
      .fill("This is for testing purpose");

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
      .fill(
        " LONG DESCRIPTION This incident is being created for testing purpose A big group of people gathered in the middle of the town square where the sun was shining brightly and the air was filled with the sound of footsteps and voices moving in every direction the children were running around chasing each other while the vendors were calling out to sell their fruits and vegetables the smell of fresh bread was drifting from the bakery and the horses tied near the fountain were stamping their hooves impatiently the old man sitting on the bench was telling a story to anyone who cared to listen and the young musicians were playing their instruments with energy and joy the entire place seemed alive with motion and sound and color and every person felt like they were part of one large living painting that stretched endlessly across the horizon with no clear beginning and no clear end only a continuous flow of activity that carried everyone forward together ",
      );

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

    //done adding image
    await page.waitForLoadState("networkidle");

    const createBtn = await page.locator("//span[normalize-space()='Create']");

    console.log("Count:", await createBtn.count());
    console.log("Visible:", await createBtn.isVisible());
    console.log("Enabled:", await createBtn.isEnabled());

    await createBtn.click();

    await page.waitForLoadState("networkidle");
    const dialog = page.locator(".ui-dialog:visible");

    await dialog.waitFor({ state: "visible" });

    console.log("Confirmation:", await dialog.innerText());

    await dialog.getByRole("button", { name: "OK", exact: true }).click();

    const okButton = page.locator("button.js-confirmBtn").click();
    await okButton.click();
    await expect(
      page.getByText("error has occured", { exact: false }),
    ).toBeVisible();

    // await page.locator("//span[@class='t-Icon icon-close']").click();

    await page.waitForLoadState("networkidle");
  });

  test.skip("TC_UI_INC_REPORT_011 , TC_UI_INC_REPORT_016  - saving draft", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");

    await page.locator("//button[@id='B4742357481340896475']").click();

    await page
      .locator("//input[@id='P4020_INCIDENT_TITLE']")
      .fill("This is for testing purpose");

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

    // await page
    //   .locator("//textarea[@id='P4020_INCIDENT_DESCRIPTION']")
    //   .fill("This incident is being created for testing purpose");

    // await page
    //   .locator("//textarea[@id='P4020_EVIDENCE_DESCRIPTION']")
    //   .fill("The evidence image will be uploded below ");

    // adding image

    // const fileChooserPromise = page.waitForEvent("filechooser");

    // await page
    //   .locator("//input[@id='mfu-input-P4020_INCIDENT_EVIDENCE_FILE']")
    //   .click();

    // const fileChooser = await fileChooserPromise;

    // await fileChooser.setFiles("C:/Users/MOHAMMED ABUBAKER/Desktop/img1.jpg");

    //done adding image
    await page.waitForLoadState("networkidle");

    await page.locator("//button[@id='B3951938374400213321']").click();

    await page.locator("//button[normalize-space()='OK']").click();

    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("Incident draft has been saved successfully.", {
        exact: false,
      }),
    ).toBeVisible();

    // const createBtn = await page.locator("//span[normalize-space()='Create']");

    // console.log("Count:", await createBtn.count());
    // console.log("Visible:", await createBtn.isVisible());
    // console.log("Enabled:", await createBtn.isEnabled());

    // await createBtn.click();

    // await page.waitForLoadState("networkidle");
    // const dialog = page.locator(".ui-dialog:visible");

    // await dialog.waitFor({ state: "visible" });

    // console.log("Confirmation:", await dialog.innerText());

    // await dialog.getByRole("button", { name: "OK", exact: true }).click();

    // const okButton = page.locator("button.js-confirmBtn").click();
    // await okButton.click();
    // await expect(
    //   page.getByText("error has occured", { exact: false }),
    // ).toBeVisible();

    // await page.locator("//span[@class='t-Icon icon-close']").click();

    await page.waitForLoadState("networkidle");
  });

  test.skip("TC_UI_INC_REPORT_014 - validating suboptions ", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");
    await page.locator("//button[@id='B4742357481340896475']").click();

    await page.locator("#P4020_INCIDENT_TYPE_NAME").selectOption({
      label: "Injury",
    });

    const dropdown = page.locator("//select[@id='P4020_SUBTYPE_NAME']");

    await expect(dropdown).toBeVisible();

    await expect(dropdown.locator("option")).toContainText([""]);
  });

  test.skip("TC_UI_INC_REPORT_015 - validating suboptions ", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");
    await page.locator("//button[@id='B4742357481340896475']").click();

    await page.locator("#P4020_INCIDENT_TYPE_NAME").selectOption({
      label: "Environmental Incident",
    });

    const dropdown = page.locator("//select[@id='P4020_SUBTYPE_NAME']");

    await expect(dropdown).toBeVisible();

    await expect(dropdown.locator("option")).toContainText([
      "Chemical Spill",
      "Waste Disposal Issue",
      "Water Pollution",
      "hazardous material leakage",
    ]);
  });

  test("TC_UI_INC_REPORT_018 - Click Cancel after entering data  ", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");
    await page.locator("//button[@id='B4742357481340896475']").click();

    await page
      .locator("//input[@id='P4020_INCIDENT_TITLE']")
      .fill("This is for testing purpose");

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

    //done adding image
    await page.waitForLoadState("networkidle");

    const createBtn = await page.locator("//span[normalize-space()='Create']");

    console.log("Count:", await createBtn.count());
    console.log("Visible:", await createBtn.isVisible());
    console.log("Enabled:", await createBtn.isEnabled());

    await createBtn.click();

    await page.waitForLoadState("networkidle");

    await page.locator("//button[contains(text(),'Cancel')]").click();

    await expect(
      page.locator("//textarea[@id='P4020_EVIDENCE_DESCRIPTION']"),
    ).toHaveValue("The evidence image will be uploded below");

    // await page.locator("//span[@class='t-Icon icon-close']").click();

    await page.waitForLoadState("networkidle");
  });
});
