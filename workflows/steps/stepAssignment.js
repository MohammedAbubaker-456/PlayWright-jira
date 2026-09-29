/**
 * Step Assignment Handler
 *
 * Handles state type: "assignment".
 *
 * Flow:
 *  1. Wait for and click main-page Assign or Reassign button.
 *  2. Locate the visible dialog / iframe.
 *  3. Locate the user dropdown inside the iframe.
 *  4. Dynamically select a valid user without hardcoding.
 *  5. Click Assign inside the iframe.
 */

async function executeStepAssignment(page, state, context) {
  console.log(`[WORKFLOW] [ASSIGNMENT] Starting assignment step...`);

  // ============================================================
  // 1. WAIT FOR AND CLICK ASSIGN / REASSIGN BUTTON
  // ============================================================

  const triggerKey = state.triggerButton || "assignButton";

  let triggerButton = null;
  if (
    context.pageRegistry &&
    typeof context.pageRegistry.getLocator === "function"
  ) {
    triggerButton = context.pageRegistry.getLocator(page, triggerKey);
  }

  const candidateLocators = [
    ...(triggerButton ? [triggerButton] : []),
    page.locator(
      "//div[@id='t_Body_content']//*[self::button or self::a or @role='button'][not(@role='treeitem')][(normalize-space(.)='Reassign' or normalize-space(.)='Assign' or contains(.,'Reassign')) and not(contains(.,'Assignment'))]"
    ),
    page
      .locator("#t_Body_content, main")
      .locator("button, a, [role='button']")
      .filter({ hasText: /Reassign|Assign/i })
      .filter({ hasNotText: /Assignment/i }),
    page.locator(
      "//div[contains(.,'Quick Actions')]//*[self::button or self::a or @role='button'][not(@role='treeitem')][contains(.,'Assign') and not(contains(.,'Assignment'))]"
    ),
  ];

  let clicked = false;
  for (const candidate of candidateLocators) {
    try {
      const target = candidate.locator("visible=true").first();
      await target.waitFor({ state: "visible", timeout: 6000 });
      console.log(`[WORKFLOW] [ASSIGNMENT] Clicking Assign/Reassign button...`);
      await target.click();
      clicked = true;
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1000);
      break;
    } catch {
      // Continue to next candidate
    }
  }

  if (!clicked) {
    for (const candidate of candidateLocators) {
      try {
        await candidate.first().waitFor({ state: "visible", timeout: 4000 });
        console.log(`[WORKFLOW] [ASSIGNMENT] Clicking Assign/Reassign button (candidate fallback)...`);
        await candidate.first().click();
        clicked = true;
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(1000);
        break;
      } catch {
        // try next
      }
    }
  }

  // ============================================================
  // 2. LOCATE VISIBLE DIALOG AND IFRAME
  // ============================================================

  console.log(`[WORKFLOW] [ASSIGNMENT] Waiting for visible assignment dialog / iframe...`);

  // Target visible iframe inside visible dialog
  const iframeElement = page.locator("iframe:visible, div[role='dialog']:visible iframe, iframe");

  await iframeElement.first().waitFor({
    state: "visible",
    timeout: 15000,
  });

  const iframe = page.frameLocator("iframe");

  console.log(`[WORKFLOW] [ASSIGNMENT] Assignment iframe detected.`);

  // ============================================================
  // 3. LOCATE USER DROPDOWN
  // ============================================================

  const userFieldKey = state.userField || "assignUserSelect";

  let userDropdown = null;
  if (
    context.pageRegistry &&
    typeof context.pageRegistry.getLocator === "function"
  ) {
    userDropdown = context.pageRegistry.getLocator(iframe, userFieldKey);
  }

  if (!userDropdown || (await userDropdown.count().catch(() => 0)) === 0) {
    userDropdown = iframe.locator("#P4040_USER, select[name*='USER'], select[name*='ASSIGN'], select");
  }

  await userDropdown.first().waitFor({
    state: "visible",
    timeout: 10000,
  });

  const dropdown = userDropdown.first();
  console.log(`[WORKFLOW] [ASSIGNMENT] User dropdown detected.`);

  // ============================================================
  // 4. GET ALL USERS AND SELECT A VALID ONE
  // ============================================================

  const options = dropdown.locator("option");
  let optionCount = await options.count();

  // If dropdown options haven't populated yet, wait up to 5 seconds
  if (optionCount <= 1) {
    const deadline = Date.now() + 5000;
    while (optionCount <= 1 && Date.now() < deadline) {
      await page.waitForTimeout(250);
      optionCount = await options.count();
    }
  }

  console.log(`[WORKFLOW] [ASSIGNMENT] Dropdown contains ${optionCount} options.`);

  if (optionCount === 0) {
    throw new Error(`[ASSIGNMENT] No options found in user dropdown.`);
  }

  const users = [];
  for (let i = 0; i < optionCount; i++) {
    const option = options.nth(i);
    const text = (await option.textContent())?.trim() || "";
    const value = (await option.getAttribute("value"))?.trim() || "";
    users.push({ index: i, text, value });
  }

  const validUsers = users.filter((user) => {
    const text = user.text.toLowerCase();
    return (
      user.value &&
      user.value.trim() !== "" &&
      !text.includes("select") &&
      !text.includes("choose") &&
      !text.includes("--")
    );
  });

  if (validUsers.length === 0) {
    throw new Error(`[ASSIGNMENT] No valid users available in dropdown.`);
  }

  const configuredUserValue = state.userValue ? String(state.userValue).trim() : null;
  let selectedUser = null;

  if (configuredUserValue) {
    console.log(`[WORKFLOW] [ASSIGNMENT] Selecting user: ${configuredUserValue}`);
    const targetLower = configuredUserValue.toLowerCase();

    // 1. Exact match on visible text or value (case-insensitive & trimmed)
    selectedUser = validUsers.find(
      (u) =>
        u.text.toLowerCase() === targetLower ||
        u.value.toLowerCase() === targetLower
    );

    // 2. Substring / contains match (case-insensitive)
    if (!selectedUser) {
      selectedUser = validUsers.find(
        (u) =>
          u.text.toLowerCase().includes(targetLower) ||
          u.value.toLowerCase().includes(targetLower)
      );
    }

    if (!selectedUser) {
      const availableUsers = validUsers.map((u) => u.text || u.value).join(", ");
      throw new Error(
        `[ASSIGNMENT] Assignment user "${configuredUserValue}" was not found in dropdown "${userFieldKey}". Available users: ${availableUsers || "none"}`
      );
    }

    console.log(`[WORKFLOW] [ASSIGNMENT] User selected: ${selectedUser.text || selectedUser.value}`);
  } else {
    selectedUser = validUsers[Math.floor(Math.random() * validUsers.length)];
    console.log(
      `[WORKFLOW] [ASSIGNMENT] Dynamically selecting user: ${selectedUser.text} (index=${selectedUser.index}, value=${selectedUser.value})`
    );
  }

  if (selectedUser.value) {
    await dropdown.selectOption({ value: selectedUser.value }).catch(async () => {
      await dropdown.selectOption({ index: selectedUser.index });
    });
  } else {
    await dropdown.selectOption({ index: selectedUser.index });
  }

  const selectedValue = await dropdown.inputValue();
  console.log(`[WORKFLOW] [ASSIGNMENT] Selected dropdown value: ${selectedValue}`);

  // ============================================================
  // 5. LOCATE AND CLICK CONFIRM ASSIGN BUTTON INSIDE IFRAME
  // ============================================================

  const submitButtonKey = state.submitButton || "assignConfirmButton";

  let submitButton = null;
  if (
    context.pageRegistry &&
    typeof context.pageRegistry.getLocator === "function"
  ) {
    submitButton = context.pageRegistry.getLocator(iframe, submitButtonKey);
  }

  if (!submitButton || (await submitButton.count().catch(() => 0)) === 0) {
    submitButton = iframe.locator(
      "button:has-text('Assign'), " +
      "input[type='button'][value='Assign'], " +
      "input[type='submit'][value='Assign'], " +
      "#B4382303473891869742, " +
      ".t-Button:has-text('Assign')"
    );
  }

  await submitButton.first().waitFor({
    state: "visible",
    timeout: 10000,
  });

  console.log(`[WORKFLOW] [ASSIGNMENT] Clicking Assign inside iframe...`);
  await submitButton.first().click();

  console.log(`[WORKFLOW] [ASSIGNMENT] Assignment completed successfully.`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);

  // If reload / refreshPage is configured, refresh the page after confirmation
  if (state.reload || state.refresh || state.refreshPage) {
    console.log(`[WORKFLOW] [ASSIGNMENT] Refreshing page after assignment confirmation...`);
    const modalDialog = page.locator("div[role='dialog']:visible, .ui-dialog:visible, iframe:visible");
    await modalDialog.waitFor({ state: "hidden", timeout: 8000 }).catch(() => {});
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
  }

  return {
    actionTaken: "ASSIGNED",
    nextState: state.next,
    details: {
      user: selectedUser.text,
      value: selectedUser.value,
    },
  };
}

module.exports = {
  executeStepAssignment,
};