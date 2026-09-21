const { expect } = require("@playwright/test");

class LoginPage {
  constructor(page) {
    this.page = page;

    // Login page elements
    this.username = "#P9999_USERNAME";
    this.password = "#P9999_PASSWORD";
    this.loginButton = "button:has-text('Sign In')";

    // After login
    // this.goToModuleButton = "button:has-text('Go To Module')";
  }

  async selectModule(moduleName) {
    if (!moduleName) return;

    console.log(`[LOGIN] Selecting module card: "${moduleName}"...`);

    // Ensure network is idle after login redirect before looking for module cards
    await this.page.waitForLoadState("networkidle").catch(() => {});

    // Target element: <h4 class="sb-module-card-title">moduleName</h4>
    // Parent card: <div class="sb-card sb-module-card" onclick="...">
    const moduleTitle = this.page
      .locator("h4.sb-module-card-title")
      .filter({ hasText: moduleName })
      .first();

    const moduleCard = this.page
      .locator("div.sb-card.sb-module-card, div.sb-module-card, div.sb-card")
      .filter({
        has: this.page.locator("h4.sb-module-card-title", { hasText: moduleName }),
      })
      .first();

    // Wait for the module card title to be visible on the landing page
    await moduleTitle.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});

    if (await moduleCard.isVisible().catch(() => false)) {
      console.log(`[LOGIN] Clicking module card container for "${moduleName}"`);
      await moduleCard.click();
    } else if (await moduleTitle.isVisible().catch(() => false)) {
      console.log(`[LOGIN] Clicking module card title (h4.sb-module-card-title) for "${moduleName}"`);
      await moduleTitle.click();
    } else {
      // Fallbacks if exact text didn't match (e.g. root module name without "Management")
      console.log(`[LOGIN] Primary locator not found, trying fallback matching for "${moduleName}"...`);
      const simplified = moduleName.replace(/management/i, "").trim();
      const fallbackTitle = this.page
        .locator("h4.sb-module-card-title, h4")
        .filter({ hasText: new RegExp(simplified, "i") })
        .first();

      const fallbackCard = this.page
        .locator("div.sb-card.sb-module-card, div.sb-module-card")
        .filter({ hasText: new RegExp(simplified, "i") })
        .first();

      if (await fallbackCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[LOGIN] Clicking fallback card for "${simplified}"`);
        await fallbackCard.click();
      } else if (await fallbackTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[LOGIN] Clicking fallback title for "${simplified}"`);
        await fallbackTitle.click();
      } else {
        // Generic fallback by text or legacy button
        const textLoc = this.page.getByText(moduleName, { exact: false }).first();
        if (await textLoc.isVisible({ timeout: 3000 }).catch(() => false)) {
          await textLoc.click();
        } else {
          const goToModule = this.page.locator("button:has-text('Go To Module'), #B3441763390632703660").first();
          if (await goToModule.isVisible({ timeout: 3000 }).catch(() => false)) {
            await goToModule.click();
          } else {
            console.warn(`[LOGIN] Warning: Could not locate card for module "${moduleName}".`);
          }
        }
      }
    }

    await this.page.waitForLoadState("networkidle").catch(() => {});
  }

  async loginToApplication(username, password, moduleName = null) {
    const loginUrl =
      process.env.LOGIN_URL ||
      "https://10.100.0.5:8443/ords/r/intg001/soapboxcloud_landing_page/login?tz=5:30";

    console.log(`[LOGIN] Navigating to login URL: ${loginUrl}`);
    await this.page.goto(loginUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    }).catch(() => {});

    await this.page.waitForLoadState("networkidle").catch(() => {});

    const usernameInput = this.page.locator(this.username);
    if (await usernameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log(`[LOGIN] Submitting credentials for user: ${username}`);
      await usernameInput.fill(username);
      await this.page.locator(this.password).fill(password);
      await this.page.locator(this.loginButton).first().click();
      await this.page.waitForLoadState("networkidle").catch(() => {});

      // Fallback if password failed
      const invalidAlert = this.page.locator("text='Invalid Login Credentials'");
      if (await invalidAlert.isVisible({ timeout: 2000 }).catch(() => false)) {
        const fallbackPassword = password === "oracle" ? "Oracle@12345" : "oracle";
        console.log(`[LOGIN] Retrying with fallback password: ${fallbackPassword}`);
        await usernameInput.fill(username);
        await this.page.locator(this.password).fill(fallbackPassword);
        await this.page.locator(this.loginButton).first().click();
        await this.page.waitForLoadState("networkidle").catch(() => {});
      }
    }

    // Wait until networkidle before attempting module card selection
    await this.page.waitForLoadState("networkidle").catch(() => {});

    // After login, click the module card if moduleName is provided
    if (moduleName) {
      await this.selectModule(moduleName);
    }
  }
}

module.exports = LoginPage;
