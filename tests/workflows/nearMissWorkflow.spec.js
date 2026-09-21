const { test, expect } = require("@playwright/test");
const { executeWorkflow } = require("../../workflows/engine/workflowEngine");
const { defaultRegistry } = require("../../pages/pageRegistry");
require("../../pages/nearMissPage");

const nearMissWorkflow = require("../../config/workflows/nearMiss.workflow.json");
const nearMissTestData = require("../../data/nearMissData.json");

test.describe("Near-Miss Reporting & Analysis Module - Workflow Automation", () => {
  test("TC_NM_WF_001 - Near-Miss Reporting to Closure Governance", async ({ page }, testInfo) => {
    test.setTimeout(60000);

    const result = await executeWorkflow(page, nearMissWorkflow, nearMissTestData, {
      strategy: "approve",
      pageRegistry: defaultRegistry,
      testInfo,
    });

    expect(result.status).toBe("completed");
    const executedStates = result.history.map((h) => h.state);
    expect(executedStates).toContain("REPORT_NEAR_MISS");
    expect(executedStates).toContain("SUBMIT_NEAR_MISS");
    expect(executedStates).toContain("REVIEW_AND_CLASSIFY");
    expect(executedStates).toContain("INVESTIGATION_AND_RCA");
    expect(executedStates).toContain("CAPA_CREATION");
    expect(executedStates).toContain("NEAR_MISS_CLOSURE_REVIEW");
    expect(executedStates).toContain("NEAR_MISS_CLOSED_SUCCESS");
  });

  test("TC_NM_WF_002 - Near-Miss Case Reopen & Rework Loop", async ({ page }, testInfo) => {
    test.setTimeout(90000);

    const result = await executeWorkflow(page, nearMissWorkflow, nearMissTestData, {
      strategy: "rejectthenapproveclosure",
      pageRegistry: defaultRegistry,
      testInfo,
    });

    expect(result.status).toBe("completed");

    const historyItems = result.history.map((h) => `${h.state} -> ${h.action}`);
    expect(historyItems.some((item) => item.includes("NEAR_MISS_CLOSURE_REVIEW -> REJECT"))).toBe(true);
    expect(historyItems.some((item) => item.includes("INVESTIGATION_AND_RCA"))).toBe(true);
    expect(historyItems.some((item) => item.includes("NEAR_MISS_CLOSURE_REVIEW -> APPROVE"))).toBe(true);
    expect(historyItems.some((item) => item.includes("NEAR_MISS_CLOSED_SUCCESS"))).toBe(true);
  });
});
