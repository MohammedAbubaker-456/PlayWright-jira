/**
 * Step Action Handler
 * -------------------
 * Handles state types: "action", "click", "tab".
 * Performs robust clicking of buttons, tabs, menu items, or dialog buttons,
 * resolving keys via the PageRegistry with resilient fallbacks.
 */

const { ApexFormFiller } = require("../../utils/apexFormFiller");

async function executeStepAction(page, state, context) {
  const targetKey = state.target || state.button || state.tab || state.locator;
  if (!targetKey) {
    throw new Error(`StepAction: State "${context.currentState}" must define a "target", "button", or "tab".`);
  }

  // Resolve container (main page or frame locator)
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
  } else {
    // Check if an APEX modal dialog iframe is visible and holds the target
    const modalIframeLoc = page.locator("div[role='dialog']:visible iframe, iframe:visible");
    if ((await modalIframeLoc.count().catch(() => 0)) > 0 && (await modalIframeLoc.first().isVisible({ timeout: 800 }).catch(() => false))) {
      const frameContainer = page.frameLocator("div[role='dialog']:visible iframe, iframe:visible").first();
      const inFrameLoc = _resolveElement(frameContainer, targetKey, context.pageRegistry);
      if ((await inFrameLoc.count().catch(() => 0)) > 0) {
        console.log(`[WORKFLOW] [ACTION] Target "${targetKey}" detected inside visible modal iframe.`);
        container = frameContainer;
      }
    }
  }

  // Special handling: Before starting investigation, ensure required Investigation Scope is not empty
  const isStartInvestigation =
    targetKey === "startInvestigationButton" ||
    targetKey.toLowerCase().includes("startinvestigation");
  if (isStartInvestigation) {
    // If Start button is not currently visible, ensure the Investigation tab is clicked first
    const startBtn = _resolveElement(page, targetKey, context.pageRegistry);
    if ((await startBtn.count().catch(() => 0)) === 0 || !(await startBtn.first().isVisible().catch(() => false))) {
      console.log(`[WORKFLOW] [ACTION] Start Investigation button not visible, ensuring Investigation tab is clicked...`);
      const invTab = _resolveElement(page, "investigationTab", context.pageRegistry);
      if ((await invTab.count().catch(() => 0)) > 0) {
        await invTab.first().click().catch(() => {});
        await page.waitForTimeout(1000);
      }
    }

    const scopeArea = page.locator(
      "#P4040_INVESTIGATION_SCOPE, #P4040_SCOPE, textarea[name*='INVESTIGATION_SCOPE'], textarea[name*='SCOPE'], " +
      "//div[.//label[contains(.,'Investigation Scope')]]//textarea | " +
      "//label[contains(.,'Investigation Scope')]/following::textarea[1] | " +
      "//textarea:visible"
    );
    try {
      if ((await scopeArea.count()) > 0 && (await scopeArea.first().isVisible({ timeout: 1500 }))) {
        const val = await scopeArea.first().inputValue().catch(() => "");
        if (!val || val.trim().length === 0) {
          console.log(`[WORKFLOW] [ACTION] Populating mandatory Investigation Scope textarea before clicking Start Investigation...`);
          await scopeArea.first().fill("Comprehensive operational investigation to identify root cause, evaluate containment controls, and verify corrective preventive actions.");
          await page.waitForTimeout(400);
        }
      }
    } catch {
      // Non-blocking if already handled
    }
  }

  const locator = _resolveElement(container, targetKey, context.pageRegistry);
  console.log(`[WORKFLOW] [ACTION] Clicking "${targetKey}" in state "${context.currentState}"...`);

  await locator.first().waitFor({ state: "visible", timeout: state.timeout || 15000 });
  await locator.first().scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});

  try {
    await locator.first().click({ timeout: state.timeout || 10000 });
  } catch (clickErr) {
    console.warn(`[WORKFLOW] [ACTION] Standard click on "${targetKey}" failed (${clickErr.message}), checking overlays and retrying with force click...`);
    const modalClose = page.locator("div[role='dialog']:visible button.ui-dialog-titlebar-close, div[role='dialog']:visible button[title='Close'], button.ui-dialog-titlebar-close:visible");
    if ((await modalClose.count().catch(() => 0)) > 0) {
      await modalClose.first().click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await locator.first().click({ force: true, timeout: 5000 });
  }

  await page.waitForLoadState("networkidle").catch(() => {});

  // If this was a tab switch, allow the tab panel animation/rendering to complete
  const isTabAction =
    targetKey.toLowerCase().includes("tab") ||
    state.type === "tab";
  if (isTabAction) {
    await page.waitForTimeout(1000);
  }

  // Handle optional dropdown / menu item selection (e.g., Action -> Verify Coc)
  if (state.menuItem) {
    const menuItemKey = state.menuItem;
    console.log(`[WORKFLOW] [ACTION] Selecting menu item "${menuItemKey}"...`);
    await page.waitForTimeout(600);

    const itemLocator = _resolveElement(page, menuItemKey, context.pageRegistry);
    try {
      await itemLocator.first().waitFor({ state: "visible", timeout: 4000 });
      await itemLocator.first().click();
    } catch {
      console.log(`[WORKFLOW] [ACTION] Triggering menu item "${menuItemKey}" directly via evaluate...`);
      await itemLocator.first().evaluate((el) => el.click()).catch(() => {});
    }
    await page.waitForLoadState("networkidle").catch(() => {});
  }

  // Handle optional APEX modal confirmation dialog (e.g. "OK" button)
  if (state.modalConfirm) {
    const okButton = page.locator(
      "//button[normalize-space()='OK'] | //button[contains(@class,'js-confirm-ok')] | //div[@role='dialog']//button[normalize-space()='OK'] | button:has-text('OK')"
    );
    try {
      if ((await okButton.count()) > 0 && (await okButton.first().isVisible({ timeout: 3500 }))) {
        console.log(`[WORKFLOW] [ACTION] Confirming APEX dialog popup (OK)...`);
        await okButton.first().click();
        await page.waitForLoadState("networkidle").catch(() => {});
      }
    } catch {
      // Dialog did not appear, proceed
    }
  }

  // If this action was closing or submitting a modal dialog, wait for overlay to vanish
  if (targetKey.toLowerCase().includes("sign") || targetKey.toLowerCase().includes("lock") || targetKey.toLowerCase().includes("save")) {
    await page.locator("div[role='dialog']:visible, .ui-dialog:visible").waitFor({ state: "hidden", timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(800);
  }

  // Verify APEX error alerts if configured
  if (state.checkErrors) {
    const filler = new ApexFormFiller(page);
    await filler.assertNoErrorAlert(state.matchErrorText || "", 3000).catch((err) => {
      if (state.catchErrors) {
        console.warn(`[WORKFLOW] [ACTION] Caught APEX alert as configured: ${err.message}`);
      } else {
        throw err;
      }
    });
  }

  if (state.waitFor) {
    const waitLoc = _resolveElement(container, state.waitFor, context.pageRegistry);
    await waitLoc.first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  }

  await page.waitForTimeout(600);

  return {
    actionTaken: "ACTION_PERFORMED",
    nextState: state.next,
    details: {
      target: targetKey,
      menuItem: state.menuItem || null,
    },
  };
}

function _resolveElement(container, key, registry) {
  // 1. Resolve via PageRegistry if registered
  if (registry && typeof registry.getLocator === "function") {
    const loc = registry.getLocator(container, key);
    if (loc) return loc;
  }

  // 2. Direct XPath or CSS selector
  if (key.startsWith("//") || key.startsWith("/") || key.startsWith("#") || key.startsWith(".") || key.includes("[")) {
    return container.locator(key);
  }

  // 3. Fallback text locators for tabs, buttons, links, or menu items
  return container.locator(
    `//button[contains(normalize-space(),'${key}')] | ` +
    `//a[contains(normalize-space(),'${key}')] | ` +
    `//span[normalize-space()='${key}'] | ` +
    `//li[contains(@class,'t-Tabs-item')]//*[contains(normalize-space(),'${key}')] | ` +
    `//li[contains(@class,'a-Menu-item')]//*[contains(normalize-space(),'${key}')]`
  );
}

module.exports = { executeStepAction };
