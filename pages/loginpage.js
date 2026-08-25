

const { expect } = require("@playwright/test");

class LoginPage {
  constructor(page) {
    this.page = page;

    // Login page elements
    this.username = "#P9999_USERNAME";
    this.password = "#P9999_PASSWORD";
    this.loginButton = "#B7616596710487751030";

    // After login
    this.goToModuleButton = "button:has-text('Go To Module')";
  }

  async loginToApplication(username, password) {
    await this.page.goto(
      "https://157.20.214.83:8443/ords/r/corex10/soapboxcloud_landing_page/login?session&SESSION&tz=5:30",
    );

    await this.page.locator(this.username).fill(username);

    await this.page.locator(this.password).fill(password);

    await this.page.locator(this.loginButton).click();

    // await this.page.locator(this.goToModuleButton).click();

    // await this.page.waitForLoadState("networkidle");
  }
}

module.exports = LoginPage;
