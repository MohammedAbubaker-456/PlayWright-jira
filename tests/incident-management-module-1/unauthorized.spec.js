const { test, expect } = require("@playwright/test");

const LoginPage = require("../../pages/loginpage");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe(
  "Global Navigation, TC_UI_INC_GLOBAL_002",
  () => {

    test(
      "Login and open main navigation",
      async ({ page }) => {

        const loginPage = new LoginPage(page);

        await loginPage.loginToApplication(
          "alice@abc.com",
          "oracleeee"
        );

        await expect(
          page.getByText("Invalid Login Credentials")
        ).toBeVisible();

      }
    );

  }
);