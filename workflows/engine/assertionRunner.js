/**
 * Assertion Runner
 * ----------------
 * Executes state-boundary assertions declaratively.
 * Integrates with Playwright's expect, ApexFormFiller, and checkBadgeColor.
 */

const { expect } = require("@playwright/test");
const { checkBadgeColor } = require("../../utils/badgeColors");
const { ApexFormFiller } = require("../../utils/apexFormFiller");

class AssertionRunner {
  /**
   * Run a list of assertions configured for a state.
   *
   * @param {import('@playwright/test').Page} page
   * @param {Array<Object>} assertions - List of assertion definitions
   * @param {Object} [pageRegistry] - Optional page registry to resolve semantic locators
   */
  static async run(page, assertions = [], pageRegistry = null) {
    if (!assertions || !assertions.length) return;

    for (const assertion of assertions) {
      const type = assertion.type;

      switch (type) {
        case "badge": {
          const badgeText = assertion.badge || assertion.text;
          const expectedBg = assertion.expectedBg || assertion.backgroundColor;
          const expectedColor = assertion.expectedColor || assertion.textColor;
          if (badgeText) {
            await checkBadgeColor(page, badgeText, expectedBg, expectedColor);
          }
          break;
        }

        case "visible": {
          const loc = this._resolveLocator(page, assertion.locator, pageRegistry);
          await expect(loc, `Expected element "${assertion.locator}" to be visible`).toBeVisible({
            timeout: assertion.timeout || 5000,
          });
          break;
        }

        case "notVisible": {
          const loc = this._resolveLocator(page, assertion.locator, pageRegistry);
          await expect(loc, `Expected element "${assertion.locator}" not to be visible`).not.toBeVisible({
            timeout: assertion.timeout || 5000,
          });
          break;
        }

        case "text": {
          const loc = this._resolveLocator(page, assertion.locator, pageRegistry);
          await expect(loc, `Expected element "${assertion.locator}" to contain text "${assertion.text}"`).toContainText(
            assertion.text,
            { timeout: assertion.timeout || 5000 }
          );
          break;
        }

        case "noApexError": {
          const filler = new ApexFormFiller(page);
          await filler.assertNoErrorAlert(assertion.matchText || "", assertion.timeout || 4000);
          break;
        }

        case "custom": {
          if (typeof assertion.fn === "function") {
            await assertion.fn(page);
          }
          break;
        }

        default:
          console.warn(`AssertionRunner: Unrecognized assertion type: "${type}"`);
          break;
      }
    }
  }

  static _resolveLocator(page, locatorTarget, pageRegistry) {
    if (!locatorTarget) {
      throw new Error("AssertionRunner: Assertion requires a locator property.");
    }

    if (typeof locatorTarget === "object" && typeof locatorTarget.click === "function") {
      return locatorTarget; // Already a Playwright Locator
    }

    // Check page registry if available
    if (pageRegistry && typeof pageRegistry.getLocator === "function") {
      const resolved = pageRegistry.getLocator(page, locatorTarget);
      if (resolved) return resolved;
    }

    // Direct CSS/XPath selector
    return page.locator(locatorTarget);
  }
}

module.exports = { AssertionRunner };
