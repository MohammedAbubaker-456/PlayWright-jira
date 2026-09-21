import { test, expect } from '@playwright/test';
const LoginPage = require("../../pages/loginpage");

test.describe('Validation UI Test Cases', () => {
    test('', async ({ page }) => {

    const loginPage = new LoginPage(page);
    await loginPage.loginToApplication(
      "alice@abc.com", 
      "oracle",
      "Incident Management"
    );
});
});