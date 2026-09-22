import { test, expect } from '@playwright/test';
const LoginPage = require("../../pages/loginpage");
const { NegativeFormFiller } = require("../../utils/negativeFormFiller");

test.describe('Validation UI Test Cases', () => {
  test('IM-VAL-001_titlemandatory', async ({ page }) => {

    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication(
      "camila.rocha@cornerstoneinfra.com",
      "oracle",
      "Incident Management"
    );
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Report New Incident" }).click();
    await page.waitForLoadState("networkidle");

    const filler = new NegativeFormFiller(page, {
      fieldData: {
        "Name of the Incident": "",
        "Incident Description": "A forklift was moving palletized material when a pedestrian entered the vehicle route. The operator braked and avoided contact. The event occurred in the Warehouse during the morning shift. Immediate controls were applied, the affected activity was made safe, and the HSE team was notified for investigation and follow-up.",
        "Evidence Description": "CCTV footage, forklift inspection checklist, pedestrian-route photographs, witness statement, and supervisor notification were reviewed. Additional supporting evidence included the applicable risk assessment or safe-work procedure, relevant training or competency records, and the corrective-action or follow-up inspection record.",
      },
      filePath: "C:/Users/Shumair Javeed/OneDrive - SoapBox/Desktop/evidence images/evidence 7-10kb.jpg",
    });

    const issues = await filler.fillAll();
    if (issues.length) {
      console.warn("Field validation issues found:", issues);
    }
    await page.locator("//span[normalize-space()='Create'] | //button[contains(.,'Create')]").first().click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Please enter the incident title", { exact: false })).toBeVisible();
  });


  test('IM-VAL-002_minimum description not allowed', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication(
      "camila.rocha@cornerstoneinfra.com",
      "oracle",
      "Incident Management"
    );
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Report New Incident" }).click();
    await page.waitForLoadState("networkidle");

    const filler = new NegativeFormFiller(page, {
      fieldData: {
        "Name of the Incident": "Forklift Load Shift - Case 002",
        "Incident Description": "A forklift",
        "Evidence Description": "CCTV footage",
      },
      filePath: "C:/Users/Shumair Javeed/OneDrive - SoapBox/Desktop/evidence images/evidence 7-10kb.jpg",
    });

    const issues = await filler.fillAll();
    if (issues.length) {
      console.warn("Field validation issues found:", issues);
    }
    await page.getByRole("button", { name: "Create" }).click();
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "OK" }).click();
    await page.waitForTimeout(3000);
    const alert = page.locator("//div[@id='t_Alert_Success']");
    await expect(alert.getByText("Incident has been created successfully.", { exact: false }),).not.toBeVisible();
  });


  test('IM-VAL-003_no script executes', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication(
      "camila.rocha@cornerstoneinfra.com",
      "oracle",
      "Incident Management"
    );
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Report New Incident" }).click();
    await page.waitForLoadState("networkidle");

    const filler = new NegativeFormFiller(page, {
      fieldData: {
        "Name of the Incident": "Forklift Load Shift - Case 002",
        "Incident Description": "<script>alert(1)</script>",
        "Evidence Description": "<script>alert(1)</script>",
      },
      filePath: "C:/Users/Shumair Javeed/OneDrive - SoapBox/Desktop/evidence images/evidence 7-10kb.jpg",
    });

    const issues = await filler.fillAll();
    if (issues.length) {
      console.warn("Field validation issues found:", issues);
    }
    await page.getByRole("button", { name: "Create" }).click();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "OK" }).click();

    await page.waitForLoadState("networkidle");
    await page.locator("(//span[@class='fa fa-eye'])[1]").click();

    await expect(page.getByText('Description', { exact: true })).toBeVisible();
    await expect(page.getByText('<script>alert(1)</script>', { exact: true })).toBeVisible();
  });


  test("IM-VAL-004_severity validation/IM-VAL-005_type validation/IM-VAL-008_site validation", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication(
      "camila.rocha@cornerstoneinfra.com",
      "oracle",
      "Incident Management"
    );
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Report New Incident" }).click();
    await page.waitForLoadState("networkidle");

    const filler = new NegativeFormFiller(page, {
      fieldData: {
        "Name of the Incident": "Forklift Load Shift - Case 002",
        "Incident Description": "A forklift was moving palletized material when a pedestrian entered the vehicle route. The operator braked and avoided contact. The event occurred in the Warehouse during the morning shift. Immediate controls were applied, the affected activity was made safe, and the HSE team was notified for investigation and follow-up.",
        "Evidence Description": "CCTV footage, forklift inspection checklist, pedestrian-route photographs, witness statement, and supervisor notification were reviewed. Additional supporting evidence included the applicable risk assessment or safe-work procedure, relevant training or competency records, and the corrective-action or follow-up inspection record.",
      },
      filePath: "C:/Users/Shumair Javeed/OneDrive - SoapBox/Desktop/evidence images/evidence 7-10kb.jpg",
    });
    const issues = await filler.fillAll();
    await page.locator('[name="P4020_SEVERITY_NAME"]').selectOption({ index: 0 });
    await page.locator('[name="P4020_INCIDENT_TYPE_NAME"]').selectOption({ index: 0 });
    await page.locator('[name="P4020_SITE_ID"]').selectOption({ index: 0 });

    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("Please select the severity.", { exact: false })).toBeVisible();
    await expect(page.getByText("Please select the incident type.", { exact: false })).toBeVisible();
    await expect(page.getByText("Please select the site.", { exact: false })).toBeVisible();
  });


  test('IM-VAL-010_unsupported file/IM-VAL-011_large file size', async ({ page }) => {

    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication(
      "camila.rocha@cornerstoneinfra.com",
      "oracle",
      "Incident Management"
    );
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Report New Incident" }).click();
    await page.waitForLoadState("networkidle");

    const filler = new NegativeFormFiller(page, {
      fieldData: {
        "Name of the Incident": "hello this is shumair from tesing team",
        "Incident Description": "A forklift was moving palletized material when a pedestrian entered the vehicle route. The operator braked and avoided contact. The event occurred in the Warehouse during the morning shift. Immediate controls were applied, the affected activity was made safe, and the HSE team was notified for investigation and follow-up.",
        "Evidence Description": "CCTV footage, forklift inspection checklist, pedestrian-route photographs, witness statement, and supervisor notification were reviewed. Additional supporting evidence included the applicable risk assessment or safe-work procedure, relevant training or competency records, and the corrective-action or follow-up inspection record.",
      },
      filePath: ["C:/Users/Shumair Javeed/Downloads/Microsoft Copilot Installer.exe", "C:/Users/Shumair Javeed/Downloads/10482317-uhd_4096_2160_25fps.mp4"],
    });

    const issues = await filler.fillAll();

    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText(".exe", { exact: false })).not.toBeVisible();
  });


  test('IM-VAL-012_multiple file chips render correctly', async ({ page }) => {

    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication(
      "camila.rocha@cornerstoneinfra.com",
      "oracle",
      "Incident Management"
    );
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Report New Incident" }).click();
    await page.waitForLoadState("networkidle");

    const filler = new NegativeFormFiller(page, {
      fieldData: {
        "Name of the Incident": "hello this is shumair from tesing team",
        "Incident Description": "A forklift was moving palletized material when a pedestrian entered the vehicle route. The operator braked and avoided contact. The event occurred in the Warehouse during the morning shift. Immediate controls were applied, the affected activity was made safe, and the HSE team was notified for investigation and follow-up.",
        "Evidence Description": "CCTV footage, forklift inspection checklist, pedestrian-route photographs, witness statement, and supervisor notification were reviewed. Additional supporting evidence included the applicable risk assessment or safe-work procedure, relevant training or competency records, and the corrective-action or follow-up inspection record.",
      },
      filePath: ["C:/Users/Shumair Javeed/Downloads/Incident Management - Operational Workflow Diagram.png", "C:/Users/Shumair Javeed/OneDrive - SoapBox/Desktop/Incident Management - UI Test Cases 1.pdf", "C:/Users/Shumair Javeed/OneDrive - SoapBox/Desktop/evidence images/evidence-6.jpg"],
    });

    const issues = await filler.fillAll();
    await page.getByRole("button", { name: "Create" }).click();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "OK" }).click();

    await page.waitForLoadState("networkidle");
    await page.locator("(//span[@class='fa fa-eye'])[1]").click();

    await page.waitForLoadState("networkidle");
    await page.getByText("Incident Evidence", { exact: true }).click();
    const supportedFileTypes = [".png", ".pdf", ".jpg"];
    for (const fileType of supportedFileTypes) {
      await expect(page.getByText(fileType, { exact: false })).toBeVisible();
    }
  });

});