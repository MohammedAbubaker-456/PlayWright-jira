/**
 * Step Table Action Handler
 * -------------------------
 * Handles state types: "tableAction", "selectRow".
 * Locates a table row matching a status or criteria (e.g., Status Name = "Open"),
 * then clicks the action element (e.g. Eye icon) within that row.
 */

async function executeStepTableAction(page, state, context) {
  const statusFilter = state.status || "Open";
  const actionKey = state.action || "eyeIcon";

  console.log(
    `[WORKFLOW] [TABLE] Searching for table row with status: "${statusFilter}" to click "${actionKey}"...`
  );

  // Wait for report table to render
  const tableLocator = page.locator(
    state.table || "table.a-IRR-table, table.t-Report-report, div.a-IRR-tableContainer table, table tbody"
  );
  await tableLocator.first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});

  // Try locating row matching status filter
  let targetRow = page.locator(
    `//table//tr[.//td[contains(normalize-space(),'${statusFilter}')]]`
  );

  let rowCount = await targetRow.count().catch(() => 0);

  // Fallback: if specific status not found or not required, take first non-empty data row
  if (rowCount === 0) {
    console.warn(
      `[WORKFLOW] [TABLE] No row matching "${statusFilter}" found. Falling back to first available record row...`
    );
    targetRow = page.locator("//table//tbody/tr[.//td[not(@colspan)]]");
    rowCount = await targetRow.count().catch(() => 0);
  }

  if (rowCount === 0) {
    // If still 0, fallback to general row selector
    targetRow = page.locator("table tbody tr");
    rowCount = await targetRow.count().catch(() => 0);
  }

  if (rowCount === 0) {
    throw new Error(
      `StepTableAction: No rows found in table on page "${context.currentPage || "current page"}".`
    );
  }

  const selectedRow = targetRow.first();
  await selectedRow.scrollIntoViewIfNeeded().catch(() => {});

  // Find the action element inside the row (Eye icon, Actions column link, or view button)
  const eyeIconLocators = [
    // Direct registry resolution
    ...(context.pageRegistry && context.pageRegistry.getLocator(selectedRow, actionKey)
      ? [context.pageRegistry.getLocator(selectedRow, actionKey)]
      : []),
    selectedRow.locator(".//span[contains(@class,'fa-eye')]/parent::a"),
    selectedRow.locator(".//a[.//span[contains(@class,'fa-eye')]]"),
    selectedRow.locator(".//span[contains(@class,'fa-eye')]"),
    selectedRow.locator(".//button[contains(@class,'fa-eye')]"),
    selectedRow.locator("span.fa-eye"),
    selectedRow.locator("a:has(span.fa-eye)"),
    selectedRow.locator("td a.t-Icon--eye"),
    selectedRow.locator("td a[title*='View'], td a[title*='Detail'], td a[title*='Edit']"),
    selectedRow.locator("td:last-child a, td:last-child button, td:last-child span, td:last-child i, td:last-child"),
    selectedRow.locator("td:nth-child(8) a, td:nth-child(8) button, td:nth-child(8) span, td:nth-child(8)"),
    selectedRow.locator("td:last-child *").first(),
    selectedRow.locator("td a, td button").last(),
    selectedRow.locator("td a").first(),
  ];

  let clicked = false;
  for (const loc of eyeIconLocators) {
    if (loc && (await loc.count().catch(() => 0)) > 0 && (await loc.first().isVisible({ timeout: 1000 }).catch(() => false))) {
      console.log(`[WORKFLOW] [TABLE] Clicking eye/action icon in table row...`);
      try {
        await loc.first().click({ timeout: 4000 });
      } catch {
        await loc.first().click({ force: true, timeout: 3000 }).catch(() => {});
      }
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    // Last resort: click any clickable anchor inside row
    const anyLink = selectedRow.locator("a, button").first();
    if ((await anyLink.count().catch(() => 0)) > 0) {
      console.log(`[WORKFLOW] [TABLE] Clicking primary row anchor...`);
      await anyLink.click();
      clicked = true;
    }
  }

  if (!clicked) {
    throw new Error(`StepTableAction: Could not find action/eye icon in the target row.`);
  }

  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1000);

  return {
    actionTaken: "ROW_SELECTED",
    nextState: state.next,
    details: {
      statusFilter,
      action: actionKey,
    },
  };
}

module.exports = { executeStepTableAction };
