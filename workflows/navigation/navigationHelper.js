/**
 * Navigation Helper
 * -----------------
 * Handles navigation to pages/modals across modules.
 * Resolves semantic page names via the PageRegistry, supporting:
 *  - URL navigation
 *  - APEX sidebar/header icon clicking (with networkidle wait)
 *  - Modal trigger clicking
 */

const { expect } = require("@playwright/test");

class NavigationHelper {
  /**
   * Navigates to the specified page or URL.
   *
   * @param {import('@playwright/test').Page} page
   * @param {string} pageKey - Semantic page key or URL
   * @param {Object} context - Execution context containing pageRegistry
   */
  static async navigateTo(page, pageKey, context, options = {}) {
    if (!pageKey) return;

    // Check if already on this page unless forced
    if (context.currentPage === pageKey && !options.forceNavigation && !context?.currentStateDef?.forceNavigation) {
      return;
    }

    console.log(`[WORKFLOW] [NAV] Navigating to page: "${pageKey}"...`);

    // 1. Direct URL
    if (pageKey.startsWith("http://") || pageKey.startsWith("https://")) {
      await page.goto(pageKey);
      await page.waitForLoadState("networkidle").catch(() => {});
      context.currentPage = pageKey;
      return;
    }

    // 2. Resolve via PageRegistry
    if (context.pageRegistry && typeof context.pageRegistry.getPage === "function") {
      const pageDef = context.pageRegistry.getPage(pageKey);
      if (pageDef) {
        if (pageDef.url) {
          await page.goto(pageDef.url);
        } else if (pageDef.iconLocator) {
          const icon = page.locator(pageDef.iconLocator);
          if ((await icon.count().catch(() => 0)) > 0 && (await icon.first().isVisible({ timeout: 2000 }).catch(() => false))) {
            await icon.first().click();
          }
        } else if (pageDef.triggerLocator) {
          const trigger = page.locator(pageDef.triggerLocator);
          if ((await trigger.count().catch(() => 0)) > 0 && (await trigger.first().isVisible({ timeout: 2000 }).catch(() => false))) {
            await trigger.first().click();
          }
        }

        await page.waitForLoadState("networkidle").catch(() => {});

        // Optional page header verification
        if (pageDef.headerLocator && pageDef.expectedTitle) {
          const header = page.locator(pageDef.headerLocator);
          if ((await header.count().catch(() => 0)) > 0) {
            await expect(header).toContainText(pageDef.expectedTitle, {
              timeout: 5000,
            }).catch(() => {});
          }
        }

        context.currentPage = pageKey;
        return;
      }
    }

    // 3. Fallback: treat as element locator to click (e.g. tab or link)
    try {
      const elem = page.locator(pageKey);
      if (await elem.count()) {
        await elem.first().click();
        await page.waitForLoadState("networkidle").catch(() => {});
      }
    } catch {
      console.warn(`[WORKFLOW] [NAV] Could not resolve navigation for: "${pageKey}"`);
    }

    context.currentPage = pageKey;
  }
}

module.exports = { NavigationHelper };
