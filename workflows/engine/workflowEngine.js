/**
 * Generic Workflow Engine
 * -----------------------
 * Core Finite State Machine (FSM) executor for end-to-end business workflows.
 * Decouples workflow orchestration from module-specific definitions.
 */

const { StepHandlerRegistry } = require("./stepHandlerRegistry");
const { DecisionStrategy } = require("./decisionStrategy");
const { AssertionRunner } = require("./assertionRunner");
const { NavigationHelper } = require("../navigation/navigationHelper");

class WorkflowLimitExceededError extends Error {
  constructor(workflowName, currentState, attempts, history) {
    const formattedHistory = history
      .map(
        (h) =>
          `  [Step ${h.step}] ${h.state} (${h.type}) -> ${h.action} -> Next: ${h.nextState || "TERMINAL"}`
      )
      .join("\n");

    const message =
      `Workflow "${workflowName}" exceeded maximum allowed attempts (${attempts}).\n` +
      `Current State: "${currentState}"\n\n` +
      `Execution History:\n${formattedHistory}\n`;

    super(message);
    this.name = "WorkflowLimitExceededError";
    Object.setPrototypeOf(this, new.target.prototype);
    this.workflowName = workflowName;
    this.currentState = currentState;
    this.attempts = attempts;
    this.history = history;
  }
}

/**
 * Executes an end-to-end workflow according to its declarative JSON configuration.
 *
 * @param {import('@playwright/test').Page} page - Playwright Page instance
 * @param {Object} workflowConfig - Declarative workflow configuration JSON
 * @param {Object} testData - Module-specific business form data
 * @param {Object} [options] - Execution overrides and options
 * @param {string|Object} [options.strategy] - Decision strategy override
 * @param {number} [options.maxAttempts] - Max loop iteration limit override
 * @param {Object} [options.pageRegistry] - Custom page registry
 * @param {import('@playwright/test').TestInfo} [options.testInfo] - Playwright test info for report attachments
 * @returns {Promise<Object>} Execution summary and history
 */
async function executeWorkflow(page, workflowConfig, testData, options = {}) {
  const startTime = Date.now();
  const workflowName = workflowConfig.name || "Unnamed Workflow";
  const maxAttempts = options.maxAttempts || workflowConfig.maxAttempts || 10;
  const maxStateVisits = workflowConfig.maxStateVisits || {};

  const decisionStrategy = new DecisionStrategy(
    options.strategy || workflowConfig.strategy || "approve",
    options.seed || workflowConfig.seed || Date.now()
  );

  const context = {
    workflowName,
    currentState: workflowConfig.start,
    currentPage: null,
    attempts: 0,
    stateVisits: {},
    history: [],
    testData,
    options,
    pageRegistry: options.pageRegistry || null,
    decisionStrategy,
    runtimeData: {},
  };

  console.log(`\n============================================================`);
  console.log(`[WORKFLOW START] ${workflowName}`);
  console.log(`Strategy: "${decisionStrategy.strategy}" | Max Attempts: ${maxAttempts}`);
  console.log(`============================================================\n`);

  let finalStatus = "completed";

  while (context.currentState) {
    // 1. Loop Safeguards
    if (context.attempts >= maxAttempts) {
      throw new WorkflowLimitExceededError(
        workflowName,
        context.currentState,
        context.attempts,
        context.history
      );
    }

    const stateName = context.currentState;
    context.stateVisits[stateName] = (context.stateVisits[stateName] || 0) + 1;

    if (maxStateVisits[stateName] && context.stateVisits[stateName] > maxStateVisits[stateName]) {
      throw new Error(
        `Workflow "${workflowName}": State "${stateName}" exceeded max allowed visits (${maxStateVisits[stateName]}).\n` +
          `Possible infinite cycle detected.`
      );
    }

    context.attempts++;
    const stepStart = Date.now();

    const stateDef = workflowConfig.states[stateName];
    if (!stateDef) {
      throw new Error(
        `Workflow "${workflowName}": Current state "${stateName}" is not defined in workflow JSON configuration.`
      );
    }

    console.log(
      `[WORKFLOW STEP ${context.attempts}] STATE: "${stateName}" (Type: "${stateDef.type}", Visit: ${context.stateVisits[stateName]})`
    );

    // 2. Pre-assertions
    if (stateDef.preAssertions && stateDef.preAssertions.length) {
      await AssertionRunner.run(page, stateDef.preAssertions, context.pageRegistry);
    }

    context.currentStateDef = stateDef;

    // 3. Navigation
    if (stateDef.page) {
      await NavigationHelper.navigateTo(page, stateDef.page, context, { forceNavigation: stateDef.forceNavigation });
    }

    // 4. Execute Step
    const result = await StepHandlerRegistry.execute(page, stateDef, context);

    // 5. Post-assertions
    if (stateDef.assertions && stateDef.assertions.length) {
      await AssertionRunner.run(page, stateDef.assertions, context.pageRegistry);
    }

    const stepDuration = Date.now() - stepStart;

    // 6. Record Step History
    context.history.push({
      step: context.attempts,
      state: stateName,
      type: stateDef.type,
      action: result.actionTaken,
      nextState: result.nextState || (result.isTerminal ? "TERMINAL" : null),
      durationMs: stepDuration,
      timestamp: new Date().toISOString(),
      details: result.details || {},
    });

    // 7. Check for Terminal State
    if (result.isTerminal || stateDef.type === "complete" || stateDef.type === "rejected" || stateDef.type === "closed") {
      finalStatus = stateDef.type === "rejected" ? "rejected" : "completed";
      console.log(`\n[WORKFLOW END] Reached terminal state "${stateName}" with status: "${finalStatus}".`);
      break;
    }

    // Advance to next state
    context.currentState = result.nextState;
  }

  const totalDuration = Date.now() - startTime;
  console.log(`[WORKFLOW FINISHED] Completed in ${context.attempts} steps (${totalDuration}ms).\n`);

  // Optional: Attach workflow execution history to Playwright test report
  if (options.testInfo && typeof options.testInfo.attach === "function") {
    const summaryMarkdown = _formatHistoryMarkdown(workflowName, context.history, finalStatus, totalDuration);
    await options.testInfo.attach("Workflow Execution History", {
      body: summaryMarkdown,
      contentType: "text/markdown",
    });
    await options.testInfo.attach("workflow-history.json", {
      body: JSON.stringify(context.history, null, 2),
      contentType: "application/json",
    });
  }

  return {
    status: finalStatus,
    attempts: context.attempts,
    durationMs: totalDuration,
    history: context.history,
  };
}

function _formatHistoryMarkdown(workflowName, history, status, duration) {
  let md = `### Workflow Execution Report: ${workflowName}\n\n`;
  md += `- **Status**: ${status.toUpperCase()}\n`;
  md += `- **Total Steps**: ${history.length}\n`;
  md += `- **Duration**: ${(duration / 1000).toFixed(2)}s\n\n`;
  md += `| Step | State | Type | Action | Next State | Duration |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const h of history) {
    md += `| ${h.step} | \`${h.state}\` | ${h.type} | **${h.action}** | \`${h.nextState || "END"}\` | ${h.durationMs}ms |\n`;
  }

  return md;
}

module.exports = {
  executeWorkflow,
  WorkflowLimitExceededError,
};
