/**
 * Step Review Handler
 * -------------------
 * Handles state type: "review".
 * Evaluates configured actions (approve, reject, sendBack), consults the
 * decision strategy, clicks the appropriate action button, and routes to
 * the corresponding transition target.
 */

const { ApexFormFiller } = require("../../utils/apexFormFiller");

async function executeStepReview(page, state, context) {
  const actions = state.actions || ["approve", "reject", "sendBack"];

  const chosenAction = context.decisionStrategy.selectAction({
    stateName: context.currentState,
    availableActions: actions,
    stateVisitCount: context.stateVisits[context.currentState] || 1,
    customStrategy: state.strategy,
  });

  console.log(`[WORKFLOW] [REVIEW] State "${context.currentState}" selected action: "${chosenAction}" (Strategy: ${context.decisionStrategy.strategy})`);

  // Target container: page or iframe
  let container = page;
  if (state.frame) {
    let frameSelector = state.frame;
    if (context.pageRegistry && context.pageRegistry.locators && context.pageRegistry.locators.has(state.frame)) {
      const resolved = context.pageRegistry.locators.get(state.frame);
      if (typeof resolved === "string") frameSelector = resolved;
    }
    const frameLoc = page.locator(frameSelector);
    if ((await frameLoc.count().catch(() => 0)) > 0) {
      container = page.frameLocator(frameSelector);
    }
  }

  // Handle optional comment if configured
  if (state.commentInput) {
    const commentField = context.pageRegistry
      ? context.pageRegistry.getLocator(container, state.commentInput) || container.locator(state.commentInput)
      : container.locator(state.commentInput);

    if (await commentField.count().catch(() => 0)) {
      const commentText = state.comments?.[chosenAction] || `Automated review decision: ${chosenAction}`;
      await commentField.fill(commentText);
    }
  }

  // Locate the button for the chosen action
  const buttonLocator = _resolveActionButton(container, chosenAction, state, context.pageRegistry);

  if (!buttonLocator) {
    throw new Error(
      `StepReview: Could not resolve button locator for action "${chosenAction}" in state "${context.currentState}".`
    );
  }

  console.log(`[WORKFLOW] [REVIEW] Clicking button for action "${chosenAction}"...`);
  await buttonLocator.first().click({ timeout: state.timeout || 8000 });

  await page.waitForLoadState("networkidle").catch(() => {});

  // Handle APEX confirmation dialog if shown
  const okButton = page.locator(
    "//button[normalize-space()='OK'] | //button[contains(@class,'js-confirm-ok')] | //div[@role='dialog']//button[normalize-space()='OK']"
  );
  try {
    if ((await okButton.count()) > 0 && (await okButton.first().isVisible({ timeout: 2000 }))) {
      await okButton.first().click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
  } catch {
    // No dialog
  }

  // Check for APEX errors
  if (state.checkErrors !== false) {
    const filler = new ApexFormFiller(page);
    await filler.assertNoErrorAlert(state.matchErrorText || "", 4000);
  }

  const nextState = state.transitions?.[chosenAction];
  if (!nextState) {
    throw new Error(
      `StepReview: No transition defined for action "${chosenAction}" in state "${context.currentState}". Configured transitions: ${JSON.stringify(state.transitions)}`
    );
  }

  return {
    actionTaken: chosenAction.toUpperCase(),
    nextState,
    details: {
      action: chosenAction,
      availableActions: actions,
      strategyUsed: context.decisionStrategy.strategy,
    },
  };
}

function _resolveActionButton(container, action, state, pageRegistry) {
  // 1. Direct state mapping
  if (state.buttons && state.buttons[action]) {
    const buttonKey = state.buttons[action];
    if (pageRegistry) {
      const loc = pageRegistry.getLocator(container, buttonKey);
      if (loc) return loc;
    }
    return container.locator(buttonKey);
  }

  // 2. Standard registry naming convention: e.g. "approveButton", "rejectButton", "sendBackButton"
  if (pageRegistry) {
    const loc = pageRegistry.getLocator(container, `${action}Button`);
    if (loc) return loc;
  }

  // 3. Fallback to common text locators
  const actionTextMap = {
    approve: ["Approve", "Approve Chemical", "Approve Closure", "Accept"],
    reject: ["Reject", "Reject Chemical", "Reject Closure"],
    sendback: ["Send Back", "Return for Update", "Return for Corrections", "Return"],
  };

  const texts = actionTextMap[action.toLowerCase()] || [action];
  const selectorParts = texts.map((t) => `button:has-text('${t}')`).join(", ");
  return container.locator(selectorParts);
}

module.exports = { executeStepReview };
