const { test, expect } = require("@playwright/test");
const LoginPage = require("../../pages/loginpage");
const { executeWorkflow, WorkflowLimitExceededError } = require("../../workflows/engine/workflowEngine");
const { defaultRegistry } = require("../../pages/pageRegistry");
require("../../pages/hazmatPage"); // Register Hazmat page definitions

const hazmatWorkflow = require("../../config/workflows/hazmat.workflow.json");
const hazmatTestData = require("../../data/hazmatChemical.json");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe("Hazardous Material Management (HMM) - Workflow Automation", () => {
  test("TC_HMM_WF_001 - Hazmat Chemical Master Approval: Straight-through Approval", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);

    // 1. Session Login
    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication("alice@abc.com", "oracle");
    await page.waitForLoadState("networkidle").catch(() => {});

    // 2. Execute Generic Workflow
    const result = await executeWorkflow(page, hazmatWorkflow, hazmatTestData, {
      strategy: "approve",
      pageRegistry: defaultRegistry,
      testInfo,
    });

    // 3. Workflow Assertions
    expect(result.status).toBe("completed");
    expect(result.history.length).toBeGreaterThanOrEqual(4);

    // Verify straight-through sequence
    const statesExecuted = result.history.map((h) => h.state);
    expect(statesExecuted).toContain("CREATE_CHEMICAL");
    expect(statesExecuted).toContain("SUBMIT_FOR_APPROVAL");
    expect(statesExecuted).toContain("APPROVAL_REVIEW");
    expect(statesExecuted).toContain("APPROVED_COMPLETE");
  });

  test("TC_HMM_WF_002 - Hazmat Chemical Master Approval: Send Back & Re-submission Loop", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);

    // 1. Session Login
    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication("alice@abc.com", "oracle");
    await page.waitForLoadState("networkidle").catch(() => {});

    // 2. Execute with Send Back -> Edit -> Resubmit -> Approve
    const result = await executeWorkflow(page, hazmatWorkflow, hazmatTestData, {
      strategy: "sendBackThenApprove",
      pageRegistry: defaultRegistry,
      testInfo,
    });

    expect(result.status).toBe("completed");

    // Verify loop path in execution history
    const historyActions = result.history.map((h) => `${h.state} -> ${h.action}`);
    expect(historyActions.some((item) => item.includes("APPROVAL_REVIEW -> SENDBACK"))).toBe(true);
    expect(historyActions.some((item) => item.includes("EDIT_CHEMICAL"))).toBe(true);
    expect(historyActions.some((item) => item.includes("RESUBMIT_CHEMICAL"))).toBe(true);
    expect(historyActions.some((item) => item.includes("APPROVAL_REVIEW -> APPROVE"))).toBe(true);
    expect(historyActions.some((item) => item.includes("APPROVED_COMPLETE"))).toBe(true);
  });

  test("TC_HMM_WF_003 - Hazmat Chemical Master Approval: Rejection Terminal State", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);

    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication("alice@abc.com", "oracle");
    await page.waitForLoadState("networkidle").catch(() => {});

    const result = await executeWorkflow(page, hazmatWorkflow, hazmatTestData, {
      strategy: "reject",
      pageRegistry: defaultRegistry,
      testInfo,
    });

    expect(result.status).toBe("rejected");
    const statesExecuted = result.history.map((h) => h.state);
    expect(statesExecuted).toContain("REJECTED_TERMINAL");
  });
});
