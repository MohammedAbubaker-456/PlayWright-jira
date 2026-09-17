const { test, expect } = require("@playwright/test");
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

    const targetUrl =
      process.env.INCIDENT_URL ||
      "https://10.100.0.5:8443/ords/r/corex10/spbx-app-inc/dashboard?session=3626170945286";
    console.log(`[TEST] Navigating to Incident Module: ${targetUrl}`);

    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    }).catch(() => { });

    await page.waitForLoadState("networkidle").catch(() => { });

    // If session expired and redirected to login, authenticate automatically
    const usernameInput = page.locator("#P9999_USERNAME");
    if (await usernameInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      console.log("[TEST] Session expired or on login page, logging in...");
      await usernameInput.fill("alice@abc.com");
      await page.locator("#P9999_PASSWORD").fill("Oracle@12345");
      await page.locator("button:has-text('Sign In'), #B7616596710487751030").first().click();
      await page.waitForLoadState("networkidle").catch(() => { });

      // Fallback if Oracle@12345 failed
      const invalidAlert = page.locator("text='Invalid Login Credentials'");
      if (await invalidAlert.isVisible({ timeout: 3000 }).catch(() => false)) {
        await usernameInput.fill("alice@abc.com");
        await page.locator("#P9999_PASSWORD").fill("oracle");
        await page.locator("button:has-text('Sign In')").first().click();
        await page.waitForLoadState("networkidle").catch(() => { });
      }

      // Wait for Go To Module button to appear after sign in
      const goToModule = page.locator("button:has-text('Go To Module'), #B3441763390632703660");
      await goToModule.waitFor({ state: "visible", timeout: 15000 }).catch(() => { });
      if (await goToModule.isVisible().catch(() => false)) {
        console.log("[TEST] Clicking 'Go To Module' button...");
        await goToModule.first().click();
        await page.waitForLoadState("networkidle").catch(() => { });
      }
    }

    // Also check if landing page already has Go To Module button visible
    const goToMod = page.locator("button:has-text('Go To Module')");
    if (await goToMod.isVisible({ timeout: 4000 }).catch(() => false)) {
      console.log("[TEST] Clicking 'Go To Module' button on landing page...");
      await goToMod.first().click();
      await page.waitForLoadState("networkidle").catch(() => { });
    }

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
