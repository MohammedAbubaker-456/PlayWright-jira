/**
 * Page Registry
 * -------------
 * Central repository mapping semantic names (pages, buttons, scopes) to
 * actual locators, avoiding hardcoded XPath/CSS selectors in workflow JSONs.
 */

class PageRegistry {
  constructor() {
    this.pages = new Map();
    this.locators = new Map();
  }

  /**
   * Registers a page configuration.
   * @param {string} pageKey - e.g. "chemicalCreate", "chemicalApproval"
   * @param {Object} pageDef - { url, iconLocator, triggerLocator, headerLocator, expectedTitle }
   */
  registerPage(pageKey, pageDef) {
    this.pages.set(pageKey, pageDef);
  }

  /**
   * Registers a locator resolution rule.
   * @param {string} locatorKey - e.g. "submitForApprovalButton", "approveButton"
   * @param {string|Function} locatorResolver - String selector or function (container) => Locator
   */
  registerLocator(locatorKey, locatorResolver) {
    this.locators.set(locatorKey, locatorResolver);
  }

  /**
   * Bulk registers locators from a dictionary.
   * @param {Record<string, string|Function>} locatorMap
   */
  registerLocators(locatorMap) {
    for (const [key, val] of Object.entries(locatorMap)) {
      this.registerLocator(key, val);
    }
  }

  getPage(pageKey) {
    return this.pages.get(pageKey);
  }

  /**
   * Resolves a semantic locator key against a page or frame container.
   * @param {import('@playwright/test').Page|import('@playwright/test').FrameLocator} container
   * @param {string} locatorKey
   * @returns {import('@playwright/test').Locator|null}
   */
  getLocator(container, locatorKey) {
    if (this.locators.has(locatorKey)) {
      const resolver = this.locators.get(locatorKey);
      if (typeof resolver === "function") {
        return resolver(container);
      }
      return container.locator(resolver);
    }
    return null;
  }
}

// Global default instance
const defaultRegistry = new PageRegistry();

module.exports = { PageRegistry, defaultRegistry };
