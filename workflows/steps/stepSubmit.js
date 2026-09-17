/**
 * Step Submit Handler
 * -------------------
 * Handles state type: "submit".
 * Finds the configured submit/action button, clicks it, handles APEX modal
 * confirmation (e.g. "OK"), and verifies there are no APEX error alerts.
 */

const { ApexFormFiller } = require("../../utils/apexFormFiller");

async function executeStepSubmit(page, state, context) {
  const buttonKey = state.button;
  if (!buttonKey) {
    throw new Error(`StepSubmit: State "${context.currentState}" has no "button" defined.`);
  }

  let buttonLocator = null;
  if (context.pageRegistry && typeof context.pageRegistry.getLocator === "function") {
    buttonLocator = context.pageRegistry.getLocator(page, buttonKey);
  }
  if (!buttonLocator) {
    buttonLocator = page.locator(buttonKey);
  }

  console.log(`[WORKFLOW] [SUBMIT] Clicking action button: "${buttonKey}"`);
  await buttonLocator.first().click();

  await page.waitForLoadState("networkidle").catch(() => {});

  // Handle APEX modal confirmation dialog (e.g. "OK" button) if present or configured
  if (state.modalConfirm !== false) {
    let okButton = null;
    if (context.pageRegistry && typeof context.pageRegistry.getLocator === "function") {
      okButton = context.pageRegistry.getLocator(page, "okButton");
    }
    if (!okButton) {
      okButton = page.locator(
        "//button[normalize-space()='OK'] | //button[contains(@class,'js-confirm-ok')] | //div[@role='dialog']//button[normalize-space()='OK'] | //div[contains(@class,'ui-dialog')]//button[normalize-space()='OK']"
      );
    }

    try {
      console.log(`[WORKFLOW] [SUBMIT] Waiting for APEX modal confirmation dialog (OK)...`);
      await okButton.first().waitFor({ state: "visible", timeout: state.modalTimeout || 10000 });
      console.log(`[WORKFLOW] [SUBMIT] Confirming APEX dialog popup (OK)...`);
      await okButton.first().click();
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1500);
    } catch {
      // Also check inside any active iframe in case dialog rendered in iframe
      const frameOk = page.frameLocator("iframe").locator(
        "//button[normalize-space()='OK'] | //button[contains(@class,'js-confirm-ok')] | //div[@role='dialog']//button[normalize-space()='OK']"
      );
      try {
        await frameOk.first().waitFor({ state: "visible", timeout: 2000 });
        console.log(`[WORKFLOW] [SUBMIT] Confirming APEX dialog popup (OK) inside iframe...`);
        await frameOk.first().click();
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(1500);
      } catch {
        console.log(`[WORKFLOW] [SUBMIT] No OK confirmation dialog appeared within timeout, proceeding.`);
      }
    }
  }

  // Verify APEX error alerts unless explicitly skipped
  if (state.checkErrors !== false) {
    const filler = new ApexFormFiller(page);
    try {
      await filler.assertNoErrorAlert(state.matchErrorText || "", 4000);
    } catch (err) {
      if (state.catchErrors) {
        console.warn(`[WORKFLOW] [SUBMIT] Caught APEX alert as configured: ${err.message}`);
      } else {
        throw err;
      }
    }
  }

  return {
    actionTaken: "SUBMITTED",
    nextState: state.next,
    details: {
      button: buttonKey,
    },
  };
}

module.exports = { executeStepSubmit };
