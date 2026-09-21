const { test, expect } = require("@playwright/test");
const { executeWorkflow } = require("../../workflows/engine/workflowEngine");
const { defaultRegistry } = require("../../pages/pageRegistry");
require("../../pages/contractorSupplierPage");

const csmWorkflow = require("../../config/workflows/contractorSupplier.workflow.json");
const csmTestData = require("../../data/contractorSupplierData.json");

test.describe("Contractor & Supplier Management (CSM) - Workflow Automation", () => {
  test("TC_CSM_WF_001 - CSM Onboarding to Site Access Approval", async ({ page }, testInfo) => {
    test.setTimeout(60000);

    const result = await executeWorkflow(page, csmWorkflow, csmTestData, {
      strategy: "approve",
      pageRegistry: defaultRegistry,
      testInfo,
    });

    expect(result.status).toBe("completed");
    const executedStates = result.history.map((h) => h.state);
    expect(executedStates).toContain("ONBOARDING_REQUEST");
    expect(executedStates).toContain("SUBMIT_ONBOARDING");
    expect(executedStates).toContain("REVIEW_AND_APPROVAL");
    expect(executedStates).toContain("DOCUMENT_AND_WORKER_CONTROL");
    expect(executedStates).toContain("VERIFY_COMPLIANCE");
    expect(executedStates).toContain("SITE_ACCESS_READINESS");
    expect(executedStates).toContain("ACTIVE_APPROVED_CONTRACTOR");
  });

  test("TC_CSM_WF_002 - CSM Review Return for Corrections Loop", async ({ page }, testInfo) => {
    test.setTimeout(90000);

    const result = await executeWorkflow(page, csmWorkflow, csmTestData, {
      strategy: "sendBackThenApprove",
      pageRegistry: defaultRegistry,
      testInfo,
    });

    expect(result.status).toBe("completed");

    const historyItems = result.history.map((h) => `${h.state} -> ${h.action}`);
    expect(historyItems.some((item) => item.includes("REVIEW_AND_APPROVAL -> SENDBACK"))).toBe(true);
    expect(historyItems.some((item) => item.includes("EDIT_ONBOARDING"))).toBe(true);
    expect(historyItems.some((item) => item.includes("REVIEW_AND_APPROVAL -> APPROVE"))).toBe(true);
    expect(historyItems.some((item) => item.includes("ACTIVE_APPROVED_CONTRACTOR"))).toBe(true);
  });
});
