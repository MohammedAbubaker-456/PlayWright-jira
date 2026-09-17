const { test, expect } = require("@playwright/test");
const { executeWorkflow, WorkflowLimitExceededError } = require("../../workflows/engine/workflowEngine");
const { DecisionStrategy } = require("../../workflows/engine/decisionStrategy");
const { StepHandlerRegistry } = require("../../workflows/engine/stepHandlerRegistry");

test.describe("Workflow Engine Core - Unit & Logic Verification", () => {
  test("DecisionStrategy should select deterministic actions correctly", () => {
    const stratApprove = new DecisionStrategy("approve");
    expect(
      stratApprove.selectAction({
        stateName: "REVIEW",
        availableActions: ["approve", "reject", "sendBack"],
        stateVisitCount: 1,
      })
    ).toBe("approve");

    const stratSendBack = new DecisionStrategy("sendBackThenApprove");
    // Pass 1: sendBack
    expect(
      stratSendBack.selectAction({
        stateName: "REVIEW",
        availableActions: ["approve", "reject", "sendBack"],
        stateVisitCount: 1,
      })
    ).toBe("sendBack");

    // Pass 2: approve
    expect(
      stratSendBack.selectAction({
        stateName: "REVIEW",
        availableActions: ["approve", "reject", "sendBack"],
        stateVisitCount: 2,
      })
    ).toBe("approve");
  });

  test("DecisionStrategy should support sequence arrays", () => {
    const seqStrat = new DecisionStrategy({
      type: "sequence",
      actions: ["sendBack", "sendBack", "approve"],
    });

    expect(
      seqStrat.selectAction({
        stateName: "REVIEW",
        availableActions: ["approve", "reject", "sendBack"],
        stateVisitCount: 1,
      })
    ).toBe("sendBack");

    expect(
      seqStrat.selectAction({
        stateName: "REVIEW",
        availableActions: ["approve", "reject", "sendBack"],
        stateVisitCount: 2,
      })
    ).toBe("sendBack");

    expect(
      seqStrat.selectAction({
        stateName: "REVIEW",
        availableActions: ["approve", "reject", "sendBack"],
        stateVisitCount: 3,
      })
    ).toBe("approve");
  });

  test.beforeAll(() => {
    StepHandlerRegistry.register("mock_form", async (page, state) => ({
      actionTaken: "MOCK_FILLED",
      nextState: state.next,
    }));

    StepHandlerRegistry.register("mock_submit", async (page, state) => ({
      actionTaken: "MOCK_SUBMITTED",
      nextState: state.next,
    }));

    StepHandlerRegistry.register("mock_review", async (page, state, context) => {
      const action = context.decisionStrategy.selectAction({
        stateName: context.currentState,
        availableActions: state.actions,
        stateVisitCount: context.stateVisits[context.currentState],
      });
      return {
        actionTaken: action.toUpperCase(),
        nextState: state.transitions[action],
      };
    });
  });

  test("executeWorkflow should execute mock workflow and record history", async () => {

    const mockWorkflow = {
      name: "Mock Hazmat Workflow",
      start: "STEP_CREATE",
      maxAttempts: 10,
      states: {
        STEP_CREATE: {
          type: "mock_form",
          next: "STEP_SUBMIT",
        },
        STEP_SUBMIT: {
          type: "mock_submit",
          next: "STEP_REVIEW",
        },
        STEP_REVIEW: {
          type: "mock_review",
          actions: ["approve", "reject", "sendBack"],
          transitions: {
            approve: "STEP_COMPLETE",
            reject: "STEP_REJECTED",
            sendBack: "STEP_EDIT",
          },
        },
        STEP_EDIT: {
          type: "mock_form",
          next: "STEP_SUBMIT",
        },
        STEP_COMPLETE: {
          type: "complete",
        },
        STEP_REJECTED: {
          type: "rejected",
        },
      },
    };

    // Mock page object
    const mockPage = {};

    // 1. Straight-through test
    const resApprove = await executeWorkflow(mockPage, mockWorkflow, {}, { strategy: "approve" });
    expect(resApprove.status).toBe("completed");
    expect(resApprove.attempts).toBe(4); // CREATE -> SUBMIT -> REVIEW -> COMPLETE
    expect(resApprove.history.map((h) => h.state)).toEqual([
      "STEP_CREATE",
      "STEP_SUBMIT",
      "STEP_REVIEW",
      "STEP_COMPLETE",
    ]);

    // 2. Loop test: sendBackThenApprove
    const resLoop = await executeWorkflow(mockPage, mockWorkflow, {}, { strategy: "sendBackThenApprove" });
    expect(resLoop.status).toBe("completed");
    expect(resLoop.attempts).toBe(7);
    expect(resLoop.history.map((h) => `${h.state} (${h.action})`)).toEqual([
      "STEP_CREATE (MOCK_FILLED)",
      "STEP_SUBMIT (MOCK_SUBMITTED)",
      "STEP_REVIEW (SENDBACK)",
      "STEP_EDIT (MOCK_FILLED)",
      "STEP_SUBMIT (MOCK_SUBMITTED)",
      "STEP_REVIEW (APPROVE)",
      "STEP_COMPLETE (COMPLETED)",
    ]);
  });

  test("executeWorkflow should enforce loop guard and throw WorkflowLimitExceededError", async () => {
    const infiniteLoopWorkflow = {
      name: "Infinite Loop Test Workflow",
      start: "LOOP_A",
      maxAttempts: 5,
      states: {
        LOOP_A: {
          type: "mock_form",
          next: "LOOP_B",
        },
        LOOP_B: {
          type: "mock_submit",
          next: "LOOP_A",
        },
      },
    };

    const mockPage = {};
    let errorThrown = null;

    try {
      await executeWorkflow(mockPage, infiniteLoopWorkflow, {});
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeTruthy();
    expect(errorThrown.name).toBe("WorkflowLimitExceededError");
    expect(errorThrown.attempts).toBe(5);
    expect(errorThrown.message).toContain('exceeded maximum allowed attempts (5)');
    expect(errorThrown.message).toContain('Execution History:');
  });
});
