const { test, expect } = require("@playwright/test");
const LoginPage = require("../../pages/loginpage.js");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe("reporting form ,TC_UI_INC_REPORT_001 ,002  ", () => {
  test("Verify if reporting form opens and verify form sections", async ({
    page,
  }) => {

    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");

    await page.locator("//button[@id='B4742357481340896475']").click();

    await expect(
      page.getByText("Report New Incident", { exact: false }),
    ).toBeVisible();

    const expectedOptions = [
      "Air Quality INdex",
      "Air pollution",
      "Chemical Exposure",
      "Chemical Spill",
      "Compliance Incident",
      "Confined Space Incident",
      "Data Breach",
      //   "Electrical Hazard",
      "Environmental Hazard",
      "Environmental Incident",
      //   "Equipment Failure",
      "Ergonomic Incident",
      //   "Explosion",
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
});
