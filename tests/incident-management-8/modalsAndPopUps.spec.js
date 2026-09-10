const { test, expect } = require("@playwright/test");
const LoginPage = require("../../pages/loginpage");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe("Modals and Pop-Ups UI Test Cases", () => {
  test("TC_UI_INC_MODAL_004 - Verify upload modal", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");

    await page.locator("//button[@id='B4742357481340896475']").click();

    const fileInput = page.locator(
      "//input[@id='mfu-input-P4020_INCIDENT_EVIDENCE_FILE']",
    );

    await expect(fileInput).toHaveAttribute("type", "file");
  });

  test("TC_UI_INC_MODAL_005 -Verify critical action confirmation", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");

    await page.locator("(//span[@class='fa fa-edit'])[1]").click();

    // await page.locator("//button[@id='B4742357481340896475']").click();

    //delete button

    await page.locator("//span[normalize-space()='Delete']").click();

    await expect(
      page.getByText("Would you like to perform this delete action?", {
        exact: false,
      }),
    ).toBeVisible();

    await page.locator("//button[contains(text(),'Cancel')]").click();

    //cancel button

    await page.locator("//button[@id='B4352033629033525573']").click();

    await expect(
      page.getByText(
        "Are you sure you want to cancel?Unsaved changes will be lost.",
        {
          exact: false,
        },
      ),
    ).toBeVisible();

    await page.locator("//button[contains(text(),'Cancel')]").click();

    // save as draft button

    await page.locator("//button[@id='B3951938374400213321']").click();

    await expect(
      page.getByText("Are you sure you want to Draft this incident?", {
        exact: false,
      }),
    ).toBeVisible();
    await page.locator("//button[contains(text(),'Cancel')]").click();
  });

  test("TC_UI_INC_MODAL_010 - Modal Focus Trap", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");

    await page.locator("//span[@class='fa fa fa-check-circle-o']").click();

    await page.waitForLoadState("networkidle");

    await page
      .locator(
        "//body[1]/form[1]/div[1]/div[2]/div[2]/main[1]/div[2]/div[1]/div[3]/div[1]/div[1]/div[1]/div[2]/div[1]/div[1]/div[1]/div[1]/div[1]/div[2]/div[1]/div[2]/div[2]/div[5]/div[1]/div[1]/div[3]/table[1]/tbody[1]/tr[2]/td[7]/a[1]/span[1]",
      )
      .click();

    // Parent dialog
    const dialog = page.locator('div[role="dialog"]');

    // Iframe inside the dialog
    const modal = page.frameLocator("iframe[title='Authorize Closure']");

    // Elements INSIDE iframe
    const comment = modal.locator("#P5080_ADMIN_COMMENT");

    const Approve = modal.getByRole("button", {
      name: "Approve Closure",
    });

    const Reject = modal.getByRole("button", {
      name: "Reject Closure",
    });

    //   const ResolutionTab = modal.locator(
    //     ".t-Tabs-link[href='#SR_R3819400478227273321']"
    //   );

    const ResolutionTab = modal.getByRole("tab", {
      name: "Resolution",
    });

    // Element OUTSIDE iframe
    const dialog1 = page
      .locator('div[role="dialog"]')
      .filter({ hasText: "Authorize Closure" });

    const CrossIcon = dialog1.locator('button[aria-label="Close"]');

    // Start focus
    await comment.focus();

    await expect(comment).toBeFocused();

    // Tab → Approve
    await page.keyboard.press("Tab");

    await expect(Approve).toBeFocused();

    // Tab → Reject
    await page.keyboard.press("Tab");

    await expect(Reject).toBeFocused();

    // Tab → Close button
    await page.keyboard.press("Tab");

    await expect(CrossIcon).toBeFocused();

    // Tab → Resolution tab
    await page.keyboard.press("Tab");

    // await expect(ResolutionTab).isActive();

    // Tab → back to Comment
    await page.keyboard.press("Tab");

    await expect(comment).toBeFocused();
    await page.waitForLoadState("networkidle");
  });
});
