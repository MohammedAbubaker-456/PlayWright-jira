/**
 * Step Submit Handler
 * -------------------
 * Handles state type: "submit".
 * Finds the configured submit/action button, clicks it, handles APEX modal
 * confirmation (e.g. "OK"), and verifies there are no APEX error alerts.
 */

const { expect } = require("@playwright/test");
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
    // 1. Immediate Playwright assertion on error notification / toast
    const errorAlert = page.locator(
      "//div[contains(@class,'t-Alert') and (contains(.,'error') or contains(.,'ORA-'))] | " +
      "//div[contains(@class,'a-Notification') and (contains(.,'error') or contains(.,'ORA-'))] | " +
      "//*[@id='t_Alert_Notification'] | " +
      "//*[contains(text(),'error has occurred') or contains(text(),'error occurred')]"
    ).first();

    const isError = await errorAlert.isVisible({ timeout: 4000 }).catch(() => false);
    if (isError) {
      const errorText = (await errorAlert.innerText().catch(() => "")).trim();
      const isSuccess = errorText.toLowerCase().includes("success") && !errorText.toLowerCase().includes("error");
      if (!isSuccess) {
        console.error(`\n[WORKFLOW] [SUBMIT] APEX error alert detected: "${errorText}"`);
        if (!state.catchErrors) {
          await expect(errorAlert, `Oracle APEX Error alert detected: "${errorText}"`).not.toBeVisible({ timeout: 1000 });
        } else {
          console.warn(`[WORKFLOW] [SUBMIT] Caught APEX alert as configured: ${errorText}`);
        }
      }
    }

    // 2. Also run comprehensive multi-frame check
    const filler = new ApexFormFiller(page);
    try {
      await filler.assertNoErrorAlert(state.matchErrorText || "", 3000);
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
