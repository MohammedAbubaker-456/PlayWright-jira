const { test, expect } = require("@playwright/test");
const LoginPage = require("../../pages/loginpage");
const { executeWorkflow } = require("../../workflows/engine/workflowEngine");
const { defaultRegistry } = require("../../pages/pageRegistry");
require("../../pages/incidentPage");

const incidentWorkflow = require("../../config/workflows/incident.workflow.json");
const incidentTestData = require("../../data/incidentData.json");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe("Incident Management Module - Live Application Workflow", () => {
  test("TC_INC_WF_001 - Incident Operational Workflow Execution", async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // 1. Session Login and Module Selection via LoginPage
    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication("camila.rocha@cornerstoneinfra.com", "oracle", "Incident Management");
    await page.waitForLoadState("networkidle").catch(() => {});

    // Execute the full Incident workflow
    console.log("\n>>> STARTING GENERIC WORKFLOW ENGINE FOR INCIDENT MODULE <<<");
    const result = await executeWorkflow(page, incidentWorkflow, incidentTestData, {
      strategy: "approve",
      pageRegistry: defaultRegistry,
      testInfo,
    });

    expect(result.status).toBe("completed");
    expect(result.history.length).toBeGreaterThanOrEqual(10);
    console.log(`[TEST] Incident Workflow successfully completed with ${result.history.length} steps!`);
  });
});
