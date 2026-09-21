const { test, expect } = require("@playwright/test");
const LoginPage = require("../../pages/loginpage");

test.use({
  ignoreHTTPSErrors: true,
});

test.describe("Accessibility UI Test Cases", () => {
  test("TC_UI_INC_A11Y_001 - Verify keyboard only navigation", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    // Login
    await loginPage.loginToApplication("alice@abc.com", "oracle");

    await page.locator("//span[@class='fa fa fa-check-circle-o']").click();

    // ---------------------------------------------------------
    // ACTIONABLE ELEMENTS TO VERIFY
    // ---------------------------------------------------------

    const actionableXPaths = [
      "//img[@alt='App Logo']",
      "//span[@class='t-Icon fa fa-home']",
      "//img[@id='header_profile_img']",
      "//span[normalize-space()='Pending Closures']",
      "//span[normalize-space()='Pending Investigations']",
      "//button[@id='R3819399218975273309_column_search_root']",
      "//input[@id='R3819399218975273309_search_field']",
      "//button[@id='R3819399218975273309_search_button']",
      "//button[@id='R3819399218975273309_actions_button']",
      "//tbody/tr/td[7]/a[1]/span[1]",
      "//a[@id='t_Footer_topButton']",
    ];

    // ---------------------------------------------------------
    // VERIFY ALL TARGET ELEMENTS EXIST
    // ---------------------------------------------------------

    for (const xpath of actionableXPaths) {
      const locator = page.locator(xpath);

      await expect(
        locator,
        `Actionable element does not exist: ${xpath}`,
      ).toHaveCount(1);
    }

    // ---------------------------------------------------------
    // STORE ELEMENTS USING UNIQUE DOM IDENTIFICATION
    // ---------------------------------------------------------

    const targets = [];

    for (const xpath of actionableXPaths) {
      const locator = page.locator(xpath).first();

      const elementInfo = await locator.evaluate((element) => {
        // Give the element a temporary unique ID
        const id = `a11y-target-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`;

        element.setAttribute("data-a11y-target", id);

        return {
          id,
          tagName: element.tagName,
          text: element.innerText || element.getAttribute("alt") || "",
        };
      });

      targets.push({
        xpath,
        ...elementInfo,
        reached: false,
      });
    }

    // ---------------------------------------------------------
    // START KEYBOARD NAVIGATION
    // ---------------------------------------------------------

    // Click body to establish a starting point
    await page.locator("body").click({
      position: { x: 5, y: 5 },
    });

    console.log("\n========== KEYBOARD NAVIGATION START ==========\n");

    const maxTabs = 150;

    for (let i = 1; i <= maxTabs; i++) {
      await page.keyboard.press("Tab");

      // Get currently focused element
      const focusedElement = page.locator(":focus");

      if ((await focusedElement.count()) === 0) {
        console.log(`TAB ${i}: No focused element`);
        continue;
      }

      const focusInfo = await focusedElement.evaluate((element) => {
        return {
          tagName: element.tagName,
          id: element.id,
          text:
            element.innerText ||
            element.value ||
            element.getAttribute("aria-label") ||
            element.getAttribute("alt") ||
            "",
          a11yTarget: element.getAttribute("data-a11y-target"),
        };
      });

      console.log(
        `TAB ${i}: ${focusInfo.tagName} | ` +
          `id="${focusInfo.id}" | ` +
          `text="${focusInfo.text}"`,
      );

      // -------------------------------------------------------
      // CHECK IF CURRENT FOCUS IS ONE OF OUR TARGETS
      // -------------------------------------------------------

      if (focusInfo.a11yTarget) {
        const target = targets.find((item) => item.id === focusInfo.a11yTarget);

        if (target) {
          target.reached = true;

          console.log(`   ✓ ACTIONABLE ELEMENT REACHED: ${target.xpath}`);
        }
      }

      // -------------------------------------------------------
      // ALSO CHECK IF FOCUS IS INSIDE AN ACTIONABLE ELEMENT
      // -------------------------------------------------------

      for (const target of targets) {
        if (target.reached) {
          continue;
        }

        const isInsideTarget = await focusedElement.evaluate(
          (element, targetId) => {
            const target = document.querySelector(
              `[data-a11y-target="${targetId}"]`,
            );

            if (!target) {
              return false;
            }

            return (
              target === element ||
              target.contains(element) ||
              element.contains(target)
            );
          },
          target.id,
        );

        if (isInsideTarget) {
          target.reached = true;

          console.log(`   ✓ ACTIONABLE ELEMENT REACHED: ${target.xpath}`);
        }
      }

      // -------------------------------------------------------
      // STOP EARLY IF EVERYTHING WAS REACHED
      // -------------------------------------------------------

      const allReached = targets.every((target) => target.reached);

      if (allReached) {
        console.log("\n✓ All actionable elements are keyboard reachable.");

        break;
      }
    }

    // ---------------------------------------------------------
    // FINAL REPORT
    // ---------------------------------------------------------

    console.log("\n========== KEYBOARD NAVIGATION RESULT ==========\n");

    const unreachableElements = targets.filter((target) => !target.reached);

    for (const target of targets) {
      if (target.reached) {
        console.log(`✓ REACHED: ${target.xpath}`);
      } else {
        console.log(`✗ NOT REACHED: ${target.xpath}`);
      }
    }

    // ---------------------------------------------------------
    // FAIL ONLY FOR ACTIONABLE ELEMENTS THAT WERE NOT REACHED
    // ---------------------------------------------------------

    expect(
      unreachableElements,
      `The following actionable elements were not reachable using keyboard Tab navigation:\n` +
        unreachableElements.map((element) => `- ${element.xpath}`).join("\n"),
    ).toHaveLength(0);
  });

  test("TC_UI_INC_A11Y_002 - Verify visible focus state ", async ({ page }) => {
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

  test("TC_UI_INC_A11Y_003 - Verify form labels and associated fields", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    // =========================================================
    // LOGIN
    // =========================================================

    await loginPage.loginToApplication("alice@abc.com", "oracle");

    console.log("\n==================================================");
    console.log("TC_UI_INC_A11Y_003 - FORM LABEL VALIDATION");
    console.log("==================================================\n");

    // =========================================================
    // FIND ALL FORM FIELD CONTAINERS
    // =========================================================

    const fieldContainers = page.locator(".t-Form-fieldContainer");

    const fieldCount = await fieldContainers.count();

    console.log(`Total form field containers found: ${fieldCount}\n`);

    expect(
      fieldCount,
      "No form field containers were found on the page",
    ).toBeGreaterThan(0);

    // Store failures so that we can report ALL problems
    // instead of stopping at the first failure.
    const failures = [];

    // =========================================================
    // PROCESS EACH FORM FIELD CONTAINER
    // =========================================================

    for (let i = 0; i < fieldCount; i++) {
      const container = fieldContainers.nth(i);

      console.log(`\n---------------- FIELD ${i + 1} ----------------`);

      // =======================================================
      // STEP 1: FIND LABEL
      // =======================================================

      const label = container.locator(".t-Form-labelContainer label");

      const labelCount = await label.count();

      if (labelCount === 0) {
        console.log("✗ FAIL: No label found");

        failures.push({
          fieldNumber: i + 1,
          reason: "No label found",
        });

        continue;
      }

      // We expect only one label per form field.
      if (labelCount > 1) {
        console.log(`✗ FAIL: Multiple labels found (${labelCount})`);

        failures.push({
          fieldNumber: i + 1,
          reason: `Multiple labels found: ${labelCount}`,
        });

        continue;
      }

      const labelElement = label.first();

      // =======================================================
      // STEP 2: GET LABEL INFORMATION
      // =======================================================

      const labelText = (await labelElement.innerText()).trim();

      const labelId = await labelElement.getAttribute("id");

      const labelFor = await labelElement.getAttribute("for");

      console.log(`Label text : "${labelText}"`);

      console.log(`Label ID   : "${labelId}"`);

      console.log(`Label FOR  : "${labelFor}"`);

      // =======================================================
      // STEP 3: VERIFY LABEL HAS TEXT
      // =======================================================

      if (!labelText) {
        console.log("✗ FAIL: Label exists but has no text");

        failures.push({
          fieldNumber: i + 1,
          labelId,
          reason: "Label has no text",
        });

        continue;
      }

      // =======================================================
      // STEP 4: VERIFY LABEL HAS "FOR"
      // =======================================================

      if (!labelFor) {
        console.log("✗ FAIL: Label does not have a 'for' attribute");

        failures.push({
          fieldNumber: i + 1,
          label: labelText,
          labelId,
          reason: "Label does not have a 'for' attribute",
        });

        continue;
      }

      // =======================================================
      // STEP 5: FIND COMPONENT/FIELD USING LABEL "FOR"
      // =======================================================

      const component = container.locator(`[id="${labelFor}"]`);

      const componentCount = await component.count();

      console.log(`Component ID "${labelFor}" count: ${componentCount}`);

      // =======================================================
      // STEP 6: VERIFY COMPONENT EXISTS
      // =======================================================

      if (componentCount === 0) {
        console.log(`✗ FAIL: No field/component found with id="${labelFor}"`);

        failures.push({
          fieldNumber: i + 1,
          label: labelText,
          labelFor,
          reason: `No field/component found with id="${labelFor}"`,
        });

        continue;
      }

      // =======================================================
      // STEP 7: GET COMPONENT TAG
      // =======================================================

      const componentTag = await component
        .first()
        .evaluate((element) => element.tagName);

      console.log(`Component tag: <${componentTag.toLowerCase()}>`);

      // =======================================================
      // STEP 8: CHECK IF COMPONENT ITSELF IS A FORM CONTROL
      // =======================================================

      const isDirectFormControl = ["INPUT", "SELECT", "TEXTAREA"].includes(
        componentTag,
      );

      if (isDirectFormControl) {
        console.log(
          `✓ PASS: "${labelText}" → ${componentTag.toLowerCase()}#${labelFor}`,
        );

        continue;
      }

      // =======================================================
      // STEP 9: HANDLE CUSTOM COMPONENTS
      // Example:
      //
      // <label for="P4010_DATE_FROM">
      //     Date From
      // </label>
      //
      // <a-date-picker id="P4010_DATE_FROM">
      //     <input id="P4010_DATE_FROM_input">
      // </a-date-picker>
      // =======================================================

      const innerControls = component
        .first()
        .locator("input:not([type='hidden']), select, textarea");

      const innerControlCount = await innerControls.count();

      console.log(`Inner form controls found: ${innerControlCount}`);

      // =======================================================
      // STEP 10: VERIFY CUSTOM COMPONENT HAS FORM CONTROL
      // =======================================================

      if (innerControlCount === 0) {
        console.log(
          `✗ FAIL: Component "${labelFor}" does not contain a form control`,
        );

        failures.push({
          fieldNumber: i + 1,
          label: labelText,
          labelFor,
          componentTag,
          reason:
            "Label points to a component, but no input/select/textarea was found inside it",
        });

        continue;
      }

      // =======================================================
      // STEP 11: GET ACTUAL INNER CONTROL INFORMATION
      // =======================================================

      const innerControl = innerControls.first();

      const innerControlTag = await innerControl.evaluate(
        (element) => element.tagName,
      );

      const innerControlId = await innerControl.getAttribute("id");

      const innerControlName = await innerControl.getAttribute("name");

      console.log(`Actual field tag : <${innerControlTag.toLowerCase()}>`);

      console.log(`Actual field ID  : "${innerControlId}"`);

      console.log(`Actual field name: "${innerControlName}"`);

      // =======================================================
      // STEP 12: VERIFY LABEL → COMPONENT → CONTROL
      // =======================================================

      if (!innerControlId && !innerControlName) {
        console.log("✗ FAIL: Inner form control has no ID or name");

        failures.push({
          fieldNumber: i + 1,
          label: labelText,
          labelFor,
          componentTag,
          reason: "Inner form control has neither ID nor name",
        });

        continue;
      }

      // =======================================================
      // SUCCESS
      // =======================================================

      console.log(
        `✓ PASS: "${labelText}" → ${labelFor} → ${innerControlId || innerControlName}`,
      );
    }

    // =========================================================
    // FINAL RESULT
    // =========================================================

    console.log("\n==================================================");

    console.log("FINAL ACCESSIBILITY RESULT");

    console.log("==================================================\n");

    if (failures.length === 0) {
      console.log(
        "✓ PASS: Every form field has a valid label and associated field.",
      );
    } else {
      console.log(`✗ FAIL: ${failures.length} accessibility issue(s) found.\n`);

      failures.forEach((failure, index) => {
        console.log(`Issue ${index + 1}:`);

        console.log(JSON.stringify(failure, null, 2));

        console.log("");
      });
    }

    // =========================================================
    // FAIL TEST ONLY AFTER CHECKING ALL FIELDS
    // =========================================================

    expect(
      failures,
      "One or more form fields have invalid or missing label associations.",
    ).toHaveLength(0);
  });

  test("TC_UI_INC_A11Y_004 - Error is associated with field", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");

    await page.locator("(//button[@id='B4742357481340896475'])[1]").click();

    await page.waitForLoadState("networkidle");

    await page
      .locator("//input[@id='P4020_INCIDENT_TITLE']")
      .fill("This is for testing purpose only");

    //await page.waitForTimeout(1000);

    await page.locator("#P4020_INCIDENT_TYPE_NAME").selectOption({
      label: "Chemical Spill",
    });
    await page.waitForLoadState("networkidle");

    await page.locator("#P4020_SUBTYPE_NAME").selectOption({
      label: "Major Spill",
    });
    //await page.waitForTimeout(1000);

    await page.locator("//select[@id='P4020_SEVERITY_NAME']").selectOption({
      label: "High",
    });
    //await page.waitForTimeout(1000);

    await page.locator("//select[@id='P4020_PRIORITY_LEVEL']").selectOption({
      label: "High",
    });
    //await page.waitForTimeout(1000);

    await page.locator("//select[@id='P4020_SITE_ID']").selectOption({
      label: "ABC_SITE_1",
    });
    //await page.waitForTimeout(1000);

    // await page.locator("//select[@id='P4020_OWNER_GROUP_ID']").selectOption({
    //   label: "Engineering",
    // });
    //await page.waitForTimeout(1000);
    await page
      .locator("//textarea[@id='P4020_INCIDENT_DESCRIPTION']")
      .fill("This incident is being created for testing purpose");

    //await page.waitForTimeout(1000);

    await page
      .locator("//textarea[@id='P4020_EVIDENCE_DESCRIPTION']")
      .fill("The evidence image will be uploded below ");

    // adding image

    const fileChooserPromise = page.waitForEvent("filechooser");

    await page
      .locator("//input[@id='mfu-input-P4020_INCIDENT_EVIDENCE_FILE']")
      .click();

    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles("C:/Users/MOHAMMED ABUBAKER/Desktop/img1.jpg");

    await page.waitForTimeout(1000);

    await page.locator("//span[normalize-space()='Create']").click();

    await page.locator("//button[normalize-space()='OK']").click();

    await page.waitForLoadState("networkidle");

    await expect(page.getByText("add group id")).toBeVisible();
  });

  test("TC_UI_INC_A11Y_005 - Verify color contrast", async ({ page }) => {
    test.setTimeout(80000);

    const loginPage = new LoginPage(page);

    await loginPage.loginToApplication("alice@abc.com", "oracle");

    console.log("\n==================================================");

    console.log("TC_UI_INC_A11Y_005 - COLOR CONTRAST VALIDATION");

    console.log("==================================================\n");

    // =========================================================
    // CONVERT CSS COLOR TO RGB
    // =========================================================
    //
    // Browser may return colors as:
    //
    // rgb(...)
    // rgba(...)
    // lab(...)
    // oklab(...)
    //
    // We use the browser itself to convert the CSS color
    // into RGB instead of trying to parse lab() manually.
    // =========================================================

    async function convertColorToRGB(color) {
      return await page.evaluate((cssColor) => {
        const canvas = document.createElement("canvas");

        canvas.width = 1;
        canvas.height = 1;

        const context = canvas.getContext("2d");

        context.clearRect(0, 0, 1, 1);

        // Browser parses rgb(), rgba(), lab(), oklab(), etc.
        context.fillStyle = cssColor;

        context.fillRect(0, 0, 1, 1);

        const pixel = context.getImageData(0, 0, 1, 1).data;

        return {
          r: pixel[0],
          g: pixel[1],
          b: pixel[2],
          alpha: pixel[3] / 255,

          rgb: `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`,
        };
      }, color);
    }

    // =========================================================
    // CALCULATE WCAG CONTRAST RATIO
    // =========================================================

    function getContrastRatio(foregroundRGB, backgroundRGB) {
      function rgbToLuminance(r, g, b) {
        const convert = (value) => {
          const normalized = value / 255;

          return normalized <= 0.03928
            ? normalized / 12.92
            : Math.pow((normalized + 0.055) / 1.055, 2.4);
        };

        const R = convert(r);
        const G = convert(g);
        const B = convert(b);

        return 0.2126 * R + 0.7152 * G + 0.0722 * B;
      }

      const foregroundLuminance = rgbToLuminance(
        foregroundRGB.r,
        foregroundRGB.g,
        foregroundRGB.b,
      );

      const backgroundLuminance = rgbToLuminance(
        backgroundRGB.r,
        backgroundRGB.g,
        backgroundRGB.b,
      );

      const lighter = Math.max(foregroundLuminance, backgroundLuminance);

      const darker = Math.min(foregroundLuminance, backgroundLuminance);

      return (lighter + 0.05) / (darker + 0.05);
    }

    // =========================================================
    // GET EFFECTIVE BACKGROUND COLOR
    // =========================================================

    async function getEffectiveBackground(locator) {
      return await locator.evaluate((element) => {
        let current = element;

        while (current) {
          const style = window.getComputedStyle(current);

          const backgroundColor = style.backgroundColor;

          // Ignore transparent backgrounds
          if (
            backgroundColor &&
            backgroundColor !== "transparent" &&
            backgroundColor !== "rgba(0, 0, 0, 0)"
          ) {
            return backgroundColor;
          }

          current = current.parentElement;
        }

        // If no background is found,
        // assume white page background.
        return "rgb(255, 255, 255)";
      });
    }

    // =========================================================
    // FIND VISIBLE TEXT ELEMENTS
    // =========================================================
    //
    // We still inspect visible DOM elements, but ONLY process
    // elements that contain their own direct text.
    //
    // This prevents a parent DIV such as:
    //
    // <div>
    //   Open Incidents
    //   896
    // </div>
    //
    // from being treated as the text element.
    // =========================================================

    const allVisibleElements = page.locator("body *:visible");

    const allVisibleCount = await allVisibleElements.count();

    console.log(`Visible DOM elements found: ${allVisibleCount}\n`);

    const failures = [];

    let checkedCount = 0;

    // =========================================================
    // CHECK EACH ELEMENT
    // =========================================================

    for (let i = 0; i < allVisibleCount; i++) {
      const element = allVisibleElements.nth(i);

      // -------------------------------------------------------
      // GET DIRECT TEXT
      // -------------------------------------------------------

      const elementInfo = await element
        .evaluate((el) => {
          const directText = Array.from(el.childNodes)
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.textContent || "")
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

          return {
            directText,

            tagName: el.tagName,

            id: el.id || "",

            className: typeof el.className === "string" ? el.className : "",
          };
        })
        .catch(() => null);

      if (!elementInfo) {
        continue;
      }

      // -------------------------------------------------------
      // IGNORE PARENT CONTAINERS
      // -------------------------------------------------------

      if (!elementInfo.directText) {
        continue;
      }

      const text = elementInfo.directText;

      if (!text) {
        continue;
      }

      // -------------------------------------------------------
      // GET FONT INFORMATION
      // -------------------------------------------------------

      const fontInfo = await element
        .evaluate((el) => {
          const style = window.getComputedStyle(el);

          return {
            color: style.color,

            fontSize: style.fontSize,

            fontWeight: style.fontWeight,

            backgroundColor: style.backgroundColor,

            backgroundImage: style.backgroundImage,
          };
        })
        .catch(() => null);

      if (!fontInfo) {
        continue;
      }

      // -------------------------------------------------------
      // GET EFFECTIVE BACKGROUND
      // -------------------------------------------------------

      const backgroundColor = await getEffectiveBackground(element);

      // -------------------------------------------------------
      // CONVERT FOREGROUND COLOR
      // -------------------------------------------------------

      const foregroundRGB = await convertColorToRGB(fontInfo.color);

      // -------------------------------------------------------
      // CONVERT BACKGROUND COLOR
      // -------------------------------------------------------

      const backgroundRGB = await convertColorToRGB(backgroundColor);

      // -------------------------------------------------------
      // CALCULATE CONTRAST
      // -------------------------------------------------------

      const contrastRatio = getContrastRatio(foregroundRGB, backgroundRGB);

      checkedCount++;

      // -------------------------------------------------------
      // FONT SIZE
      // -------------------------------------------------------

      const fontSize = parseFloat(fontInfo.fontSize);

      const fontWeight = parseInt(fontInfo.fontWeight) || 400;

      // -------------------------------------------------------
      // DETERMINE LARGE TEXT
      // -------------------------------------------------------

      const isLargeText =
        fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);

      // -------------------------------------------------------
      // WCAG REQUIREMENT
      // -------------------------------------------------------

      const requiredRatio = isLargeText ? 3 : 4.5;

      // -------------------------------------------------------
      // LOG RESULT
      // -------------------------------------------------------

      console.log(`\nElement ${checkedCount}`);

      console.log(`Text       : "${text.substring(0, 100)}"`);

      console.log(`Tag        : <${elementInfo.tagName.toLowerCase()}>`);

      if (elementInfo.id) {
        console.log(`ID         : ${elementInfo.id}`);
      }

      if (elementInfo.className) {
        console.log(`Class      : ${elementInfo.className}`);
      }

      console.log(`Foreground : ${fontInfo.color}`);

      console.log(`Foreground RGB : ${foregroundRGB.rgb}`);

      console.log(`Background : ${backgroundColor}`);

      console.log(`Background RGB : ${backgroundRGB.rgb}`);

      console.log(`Font size  : ${fontInfo.fontSize}`);

      console.log(`Font weight: ${fontInfo.fontWeight}`);

      console.log(`Contrast   : ${contrastRatio.toFixed(2)}:1`);

      console.log(`Required   : ${requiredRatio}:1`);

      // -------------------------------------------------------
      // PASS / FAIL
      // -------------------------------------------------------

      if (contrastRatio < requiredRatio) {
        console.log("✗ FAIL - Insufficient contrast");

        failures.push({
          elementNumber: checkedCount,

          tag: elementInfo.tagName,

          id: elementInfo.id,

          className: elementInfo.className,

          text: text.substring(0, 100),

          foreground: foregroundRGB.rgb,

          foregroundOriginal: fontInfo.color,

          background: backgroundRGB.rgb,

          backgroundOriginal: backgroundColor,

          fontSize: fontInfo.fontSize,

          fontWeight: fontInfo.fontWeight,

          contrastRatio: Number(contrastRatio.toFixed(2)),

          requiredRatio,
        });
      } else {
        console.log("✓ PASS - Contrast meets requirement");
      }
    }

    // =========================================================
    // FINAL REPORT
    // =========================================================

    console.log("\n==================================================");

    console.log("COLOR CONTRAST FINAL RESULT");

    console.log("==================================================\n");

    console.log(`Text elements checked : ${checkedCount}`);

    console.log(`Failures             : ${failures.length}`);

    // =========================================================
    // PRINT FAILURES
    // =========================================================

    if (failures.length > 0) {
      console.log("\nContrast failures:\n");

      failures.forEach((failure, index) => {
        console.log(`Failure ${index + 1}:`);

        console.log(`Text          : ${failure.text}`);

        console.log(`Tag           : <${failure.tag.toLowerCase()}>`);

        if (failure.id) {
          console.log(`ID            : ${failure.id}`);
        }

        if (failure.className) {
          console.log(`Class         : ${failure.className}`);
        }

        console.log(`Foreground    : ${failure.foregroundOriginal}`);

        console.log(`Foreground RGB: ${failure.foreground}`);

        console.log(`Background    : ${failure.backgroundOriginal}`);

        console.log(`Background RGB: ${failure.background}`);

        console.log(`Font size     : ${failure.fontSize}`);

        console.log(`Font weight   : ${failure.fontWeight}`);

        console.log(`Contrast      : ${failure.contrastRatio}:1`);

        console.log(`Required      : ${failure.requiredRatio}:1`);

        console.log("");
      });
    } else {
      console.log(
        "\n✓ All checked text meets the required WCAG contrast ratio.",
      );
    }

    // =========================================================
    // FAIL TEST IF CONTRAST FAILURES EXIST
    // =========================================================

    expect(
      failures,
      "One or more text elements do not meet the required WCAG color contrast ratio.",
    ).toHaveLength(0);
  });

  test("TC_UI_INC_A11Y_007 - Verify modal focus trap", async ({ page }) => {
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
