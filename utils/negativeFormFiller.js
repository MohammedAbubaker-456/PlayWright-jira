/**
 * NegativeFormFiller
 * -------------------
 * Reusable, self-discovering form filler for Oracle APEX forms designed specifically
 * for negative and boundary testing in Playwright.
 *
 * DIFFERENCE FROM ApexFormFiller:
 * - Does NOT fill dummy Lorem Ipsum text when a label does not match fieldData.
 * - Any field without an explicit match in `fieldData` is intentionally left untouched/empty,
 *   allowing tests to validate mandatory field restrictions, missing inputs, and invalid payloads.
 * - Supports label-based matching for text inputs, textareas, AND dropdowns.
 * - Provides specialized negative assertion helpers (e.g. assertErrorAlert, assertInlineError).
 *
 * USAGE EXAMPLE:
 * ```javascript
 * const { NegativeFormFiller } = require('../utils/negativeFormFiller');
 *
 * const filler = new NegativeFormFiller(page, {
 *   // Only provide the fields you want to fill; unmatched fields will NOT be filled with lorem
 *   fieldData: {
 *     "Incident Title": "", // Intentionally blank
 *     "Incident Description": "Testing mandatory validation"
 *   }
 * });
 *
 * await filler.fillAll();
 * await page.locator("button:has-text('Create')").click();
 *
 * // Assert that APEX shows an error alert
 * await filler.assertErrorAlert("error has occurred");
 * ```
 */

const { expect } = require("@playwright/test");

class NegativeFormFiller {
  /**
   * Auto-detect the form scope by walking up from a known field on the page
   * (e.g. the title input) to the nearest dialog/modal/region ancestor.
   *
   * @param {import('@playwright/test').Page} page
   * @param {string} anchorSelector - XPath/CSS selector for any field known to be inside the form.
   * @returns {import('@playwright/test').Locator}
   */
  static autoScope(page, anchorSelector) {
    return page
      .locator(anchorSelector)
      .locator(
        "xpath=ancestor::*[@role='dialog' or contains(@class,'dialog') or contains(@class,'t-Dialog') or contains(@class,'apex-dialog') or contains(@class,'t-Region')][1]"
      );
  }

  /**
   * @param {import('@playwright/test').Page} page - Playwright Page instance
   * @param {Object} [options]
   * @param {import('@playwright/test').Locator} [options.scope] - Scoped locator for the form region/dialog. Defaults to #t_Body_content or body.
   * @param {Object} [options.fieldData] - Map of label text -> value. Only fields matching these labels will be populated. Unmatched fields remain untouched (no Lorem text).
   * @param {string} [options.filePath] - File path used for file uploads if uploadFiles is enabled.
   * @param {boolean} [options.uploadFiles] - Whether to perform file upload during fillAll(). Default true if filePath is set.
   * @param {boolean} [options.autoSelectDropdowns] - Whether to randomly select unmatched dropdowns. Default false (unmatched dropdowns remain unselected for negative testing).
   * @param {boolean} [options.enableToggles] - Whether to auto-enable boolean checkboxes/toggles. Default false.
   * @param {boolean} [options.enforceMaxLength] - If false, allows entering values longer than maxlength to test validation. Default true.
   */
  constructor(page, options = {}) {
    this.page = page;
    this.scope = options.scope || null;

    this.fieldData = {};
    if (options.fieldData) {
      this.setFieldData(options.fieldData);
    } else {
      // Support passing field mappings directly at the top level of options
      const reservedKeys = new Set([
        "scope",
        "fieldData",
        "filePath",
        "uploadFiles",
        "autoSelectDropdowns",
        "defaultDropdownIndex",
        "enableToggles",
        "enforceMaxLength",
        "testBoundaries",
      ]);
      const rootFieldData = {};
      for (const [key, value] of Object.entries(options)) {
        if (!reservedKeys.has(key)) {
          rootFieldData[key] = value;
        }
      }
      if (Object.keys(rootFieldData).length > 0) {
        this.setFieldData(rootFieldData);
      }
    }

    this.staticData = {
      filePath: options.filePath || process.env.EVIDENCE_FILE_PATH || null,
    };

    this.uploadFilesEnabled =
      options.uploadFiles !== undefined ? options.uploadFiles : Boolean(this.staticData.filePath);

    this.autoSelectDropdowns =
      options.autoSelectDropdowns !== undefined ? options.autoSelectDropdowns : true;

    // Default dropdown index fallback when autoSelectDropdowns is false (0th index placeholder)
    this.defaultDropdownIndex =
      options.defaultDropdownIndex !== undefined ? options.defaultDropdownIndex : 0;

    this.enableToggles =
      options.enableToggles !== undefined ? options.enableToggles : false;

    this.enforceMaxLength =
      options.enforceMaxLength !== undefined ? options.enforceMaxLength : true;

    this.validationIssues = [];
  }

  /** Normalizes a label: strips required asterisks, trims, and converts to lowercase. */
  _normalizeLabel(text) {
    return (text || "")
      .replace(/\*/g, "")
      .replace(/\((?:value required|optional|required)\)/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  /**
   * Sets or updates field data mapping (e.g. { "Incident Title": "Sample", "Severity": "High" }).
   * Keys are normalized automatically and common APEX synonyms are registered.
   */
  setFieldData(data) {
    this.fieldData = {};
    for (const [key, value] of Object.entries(data || {})) {
      const normalized = this._normalizeLabel(key);
      this.fieldData[normalized] = value;

      // Register common APEX label aliases
      if (normalized === "incident title" || normalized === "title") {
        this.fieldData["name of the incident"] = value;
        this.fieldData["incident title"] = value;
        this.fieldData["name"] = value;
      } else if (normalized === "name of the incident" || normalized === "name") {
        this.fieldData["incident title"] = value;
        this.fieldData["name of the incident"] = value;
        this.fieldData["title"] = value;
      } else if (normalized === "incident description") {
        this.fieldData["description"] = value;
      } else if (normalized === "evidence description") {
        this.fieldData["evidence"] = value;
      }
    }
  }

  /**
   * Resolves field value from fieldData by checking:
   * 1. Direct normalized label match
   * 2. APEX element ID (stripping page prefix, e.g. P4020_INCIDENT_TITLE -> incident title)
   * 3. Element name attribute
   */
  _getFieldValue(label, elementId = null, name = null) {
    if (label && this.fieldData[label] !== undefined) {
      return this.fieldData[label];
    }
    if (elementId) {
      const cleanId = this._normalizeLabel(elementId.replace(/^P\d+_/, "").replace(/_/g, " "));
      if (this.fieldData[cleanId] !== undefined) {
        return this.fieldData[cleanId];
      }
    }
    if (name) {
      const cleanName = this._normalizeLabel(name.replace(/^P\d+_/, "").replace(/_/g, " "));
      if (this.fieldData[cleanName] !== undefined) {
        return this.fieldData[cleanName];
      }
    }
    return undefined;
  }

  /**
   * Finds the normalized label text for a given field locator.
   * Checks label[for=id], aria-labelledby, and enclosing container labels.
   */
  async _getFieldLabel(field) {
    const id = await field.getAttribute("id").catch(() => null);
    if (!id) return null;

    let label = null;
    if (this.scope && typeof this.scope.locator === "function") {
      label = this.scope.locator(`label[for='${id}']`);
      if ((await label.count().catch(() => 0)) === 0) {
        label = null;
      }
    }

    if (!label) {
      label = this.page.locator(`label[for='${id}']`);
      if ((await label.count().catch(() => 0)) === 0) {
        label = null;
      }
    }

    // Fallback: check ancestor container for label
    if (!label) {
      const containerLabel = field.locator("xpath=ancestor::*[contains(@class,'t-Form-fieldContainer') or contains(@class,'t-Form-item')][1]//label");
      if ((await containerLabel.count().catch(() => 0)) > 0) {
        label = containerLabel.first();
      }
    }

    if (!label) {
      const ariaLabel = await field.getAttribute("aria-label").catch(() => null);
      if (ariaLabel) return this._normalizeLabel(ariaLabel);

      const placeholder = await field.getAttribute("placeholder").catch(() => null);
      if (placeholder) return this._normalizeLabel(placeholder);

      const cleanId = id.replace(/^P\d+_/, "").replace(/_/g, " ");
      return this._normalizeLabel(cleanId);
    }

    const text = (await label.first().innerText().catch(() => "")).trim();
    if (text) return this._normalizeLabel(text);

    const cleanId = id.replace(/^P\d+_/, "").replace(/_/g, " ");
    return this._normalizeLabel(cleanId);
  }

  /** Lazily resolves form scope: modal iframe > open dialog > #t_Body_content > body */
  async _resolveScope() {
    if (this.scope) return this.scope;

    // Check if an APEX modal dialog with an iframe is visible
    const modalIframe = this.page.locator("div[role='dialog'] iframe, iframe.ui-dialog-content, iframe:visible");
    if ((await modalIframe.count().catch(() => 0)) > 0 && (await modalIframe.first().isVisible({ timeout: 1000 }).catch(() => false))) {
      this.scope = this.page.frameLocator("div[role='dialog'] iframe, iframe.ui-dialog-content, iframe:visible").locator("body");
      return this.scope;
    }

    // Check if an APEX modal dialog (without iframe) is visible
    const openDialog = this.page.locator("div[role='dialog']:visible, .ui-dialog:visible");
    if ((await openDialog.count().catch(() => 0)) > 0) {
      this.scope = openDialog.first();
      return this.scope;
    }

    const universalThemeContent = this.page.locator("#t_Body_content");
    if ((await universalThemeContent.count()) > 0) {
      this.scope = universalThemeContent;
    } else {
      this.scope = this.page.locator("body");
    }
    return this.scope;
  }

  /**
   * Executes form filling:
   * - Only fills inputs/textareas/selects matching entries in fieldData.
   * - Does NOT fill unmatched fields with Lorem Ipsum.
   */
  async fillAll() {
    await this._resolveScope();

    let fieldCount = await this.scope
      .locator("input, textarea, select")
      .count();
    if (fieldCount === 0) {
      await this.scope.locator("input, textarea, select").first().waitFor({ state: "attached", timeout: 4000 }).catch(() => {});
      fieldCount = await this.scope.locator("input, textarea, select").count();
    }
    if (fieldCount === 0) {
      throw new Error(
        "NegativeFormFiller: scope matched 0 form fields. Check that the scope " +
        "locator wraps the visible form and the form has finished loading.",
      );
    }

    await this.fillTextInputs();
    await this.fillTextAreas();
    await this.selectDropdowns();
    await this.fillToggles();
    if (this.uploadFilesEnabled) {
      await this.uploadFiles();
    }
    return this.validationIssues;
  }

  // ---------- TEXT INPUTS (Label-matched only, NO lorem fallback) ----------
  async fillTextInputs() {
    let inputs = this.scope.locator("input.apex-item-text:visible");
    if ((await inputs.count()) === 0) {
      inputs = this.scope.locator("input[type='text']:visible, input[type='email']:visible, input[type='number']:visible");
    }

    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      if (await input.isDisabled().catch(() => false)) continue;
      if (await input.getAttribute("readonly").catch(() => null)) continue;

      const label = await this._getFieldLabel(input);
      const id = await input.getAttribute("id").catch(() => null);
      const name = await input.getAttribute("name").catch(() => null);
      const val = this._getFieldValue(label, id, name);
      const matched = val !== undefined;

      if (matched) {
        let text = String(val);
        const maxLengthAttr = await input.getAttribute("maxlength").catch(() => null);
        if (maxLengthAttr && this.enforceMaxLength) {
          text = text.substring(0, parseInt(maxLengthAttr, 10));
        }
        await input.fill(text);
      }
      // If NOT matched: DO NOT fill with lorem text. Leave untouched.
    }
  }

  // ---------- TEXTAREAS (Label-matched only, NO lorem fallback) ----------
  async fillTextAreas() {
    let areas = this.scope.locator("textarea.apex-item-textarea:visible");
    if ((await areas.count()) === 0) {
      areas = this.scope.locator("textarea:visible");
    }

    const count = await areas.count();
    for (let i = 0; i < count; i++) {
      const area = areas.nth(i);
      if (await area.isDisabled().catch(() => false)) continue;
      if (await area.getAttribute("readonly").catch(() => null)) continue;

      const label = await this._getFieldLabel(area);
      const id = await area.getAttribute("id").catch(() => null);
      const name = await area.getAttribute("name").catch(() => null);
      const val = this._getFieldValue(label, id, name);
      const matched = val !== undefined;

      if (matched) {
        let text = String(val);
        const maxLengthAttr = await area.getAttribute("maxlength").catch(() => null);
        if (maxLengthAttr && this.enforceMaxLength) {
          text = text.substring(0, parseInt(maxLengthAttr, 10));
        }
        await area.fill(text);
      }
      // If NOT matched: DO NOT fill with lorem text. Leave untouched.
    }
  }

  // ---------- DROPDOWNS (Label-matched or optional fallback) ----------
  async selectDropdowns() {
    let selects = this.scope.locator("select.apex-item-select:visible");
    if ((await selects.count()) === 0) {
      selects = this.scope.locator("select:visible");
    }

    const total = await selects.count();
    const handled = new Array(total).fill(false);

    // Multi-pass handling for cascading dropdowns (e.g. Type -> Subtype)
    const maxPasses = 4;
    for (let pass = 0; pass < maxPasses; pass++) {
      let progressed = false;

      for (let i = 0; i < total; i++) {
        if (handled[i]) continue;

        const select = selects.nth(i);
        if (await select.isDisabled().catch(() => true)) {
          // If disabled on early pass, parent dropdown might enable it later
          if (pass === maxPasses - 1) handled[i] = true;
          continue;
        }

        const label = await this._getFieldLabel(select);
        const id = await select.getAttribute("id").catch(() => null);
        const name = await select.getAttribute("name").catch(() => null);
        const desired = this._getFieldValue(label, id, name);
        const hasExplicitValue = desired !== undefined;

        let optionCount = await select.locator("option").count();
        if (optionCount <= 1) {
          const deadline = Date.now() + 2000;
          while (optionCount <= 1 && Date.now() < deadline) {
            await this.page.waitForTimeout(200);
            optionCount = await select.locator("option").count();
          }
        }

        if (optionCount > 0) {
          // Defer single-option dropdowns on early passes if waiting for cascading AJAX
          if (optionCount <= 1 && pass < maxPasses - 1 && !hasExplicitValue) {
            continue;
          }

          if (hasExplicitValue) {
            if (desired === "" || desired === null) {
              // Intentionally choose 0th index (placeholder)
              await select.selectOption({ index: 0 }).catch(() => {});
            } else if (typeof desired === "number") {
              await select.selectOption({ index: desired }).catch(() => {});
            } else {
              // Try matching by label first, then value
              await select.selectOption({ label: String(desired) }).catch(async () => {
                await select.selectOption({ value: String(desired) }).catch(() => {});
              });
            }
          } else {
            // Random selection: pick from index 1 (skipping index 0 placeholder) up to optionCount - 1
            if (this.autoSelectDropdowns) {
              if (optionCount > 1) {
                const min = 1;
                const max = optionCount - 1;
                const randomIndex = min + Math.floor(Math.random() * (max - min + 1));
                await select.selectOption({ index: randomIndex }).catch(() => {});
              } else {
                await select.selectOption({ index: 0 }).catch(() => {});
              }
            } else {
              // Explicitly select default index (usually 0th placeholder)
              await select.selectOption({ index: this.defaultDropdownIndex }).catch(() => {});
            }
          }

          await this.page.waitForLoadState("networkidle").catch(() => {});
          await this.page.waitForTimeout(250);
          handled[i] = true;
          progressed = true;
        }
      }

      if (!progressed) break;
    }
  }

  // ---------- TOGGLE SWITCHES ----------
  async fillToggles() {
    if (!this.enableToggles) return;

    const toggles = this.scope.locator("input[type='checkbox']:visible");
    const count = await toggles.count();

    for (let i = 0; i < count; i++) {
      const toggle = toggles.nth(i);
      if (await toggle.isDisabled().catch(() => true)) continue;

      const label = await this._getFieldLabel(toggle);
      const hasConfig = label !== null && this.fieldData[label] !== undefined;

      const shouldCheck = hasConfig ? Boolean(this.fieldData[label]) : true;
      const alreadyChecked = await toggle.isChecked().catch(() => false);

      if (shouldCheck && !alreadyChecked) {
        try {
          await toggle.check({ force: true });
        } catch {
          await toggle.click({ force: true }).catch(() => {});
        }
      } else if (!shouldCheck && alreadyChecked) {
        try {
          await toggle.uncheck({ force: true });
        } catch {
          await toggle.click({ force: true }).catch(() => {});
        }
      }
    }
  }

  // ---------- FILE UPLOADS ----------
  async uploadFiles() {
    const fileInputs = this.scope.locator("input[type='file']");
    const count = await fileInputs.count();

    for (let i = 0; i < count; i++) {
      const fileInput = fileInputs.nth(i);
      if (this.staticData && this.staticData.filePath) {
        try {
          await fileInput.setInputFiles(this.staticData.filePath);
          await this.page.waitForTimeout(400);
        } catch {
          try {
            const fileChooserPromise = this.page.waitForEvent("filechooser", { timeout: 2500 });
            await fileInput.click({ force: true });
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(this.staticData.filePath);
            await this.page.waitForTimeout(400);
          } catch {
            // Optional upload
          }
        }
      }
    }
  }

  /** Clears all text inputs and textareas within the current scope. */
  async clearAll() {
    await this._resolveScope();
    const textElements = this.scope.locator("input[type='text']:visible, textarea:visible, input.apex-item-text:visible, textarea.apex-item-textarea:visible");
    const count = await textElements.count();
    for (let i = 0; i < count; i++) {
      const el = textElements.nth(i);
      if (await el.isDisabled().catch(() => false)) continue;
      if (await el.getAttribute("readonly").catch(() => null)) continue;
      await el.fill("");
    }
  }

  // ---------- NEGATIVE ASSERTION: EXPECT ERROR ALERT ----------
  /**
   * Asserts that an Oracle APEX error alert / notification banner DOES appear.
   * Use this in negative test cases to verify that invalid or incomplete submissions fail.
   *
   * @param {string} [matchText] - Optional substring expected inside the error message (e.g. "error has occurred", "ORA-", "mandatory").
   * @param {number} [timeoutMs] - Maximum wait time for the error alert to appear. Default 5000ms.
   */
  async assertErrorAlert(matchText = "", timeoutMs = 5000) {
    const errorSelector =
      "//div[contains(@class,'t-Alert') and (contains(.,'error') or contains(.,'ORA-'))] | " +
      "//div[contains(@class,'a-Notification') and (contains(.,'error') or contains(.,'ORA-'))] | " +
      "//*[@id='t_Alert_Notification'] | " +
      "//*[contains(text(),'error has occurred') or contains(text(),'error occurred')] | " +
      ".a-Notification--error, .t-Alert--danger, .t-Alert--error, .t-Alert--warning, .apex-page-error, #APEX_ERROR_MESSAGE, .htmldbStdErr, .a-Notification-item";

    const errorLocator = this.page.locator(errorSelector).first();

    await expect(
      errorLocator,
      `NegativeFormFiller: Expected APEX error alert to appear within ${timeoutMs}ms, but none was visible.`
    ).toBeVisible({ timeout: timeoutMs });

    if (matchText) {
      const alertText = (await errorLocator.innerText().catch(() => "")).trim();
      expect(
        alertText.toLowerCase(),
        `NegativeFormFiller: Expected error alert text to contain "${matchText}", got: "${alertText}"`
      ).toContain(matchText.toLowerCase());
    }

    return errorLocator;
  }

  // ---------- NEGATIVE ASSERTION: EXPECT INLINE FIELD VALIDATION ERROR ----------
  /**
   * Asserts that an APEX inline field validation error is visible on the form.
   *
   * @param {string} [expectedText] - Optional expected validation text (e.g. "Value required").
   * @param {number} [timeoutMs] - Maximum wait time. Default 4000ms.
   */
  async assertInlineError(expectedText = "", timeoutMs = 4000) {
    const inlineErrorLocator = this.page.locator(
      ".apex-page-item-error, .u-ErrorText, .t-Form-error, .a-Form-error, span[id*='_error']"
    ).first();

    await expect(
      inlineErrorLocator,
      `NegativeFormFiller: Expected an inline field validation error to be visible, but none appeared.`
    ).toBeVisible({ timeout: timeoutMs });

    if (expectedText) {
      const errorText = (await inlineErrorLocator.innerText().catch(() => "")).trim();
      expect(
        errorText.toLowerCase(),
        `NegativeFormFiller: Expected inline error to contain "${expectedText}", got: "${errorText}"`
      ).toContain(expectedText.toLowerCase());
    }

    return inlineErrorLocator;
  }

  // ---------- ASSERT NO ERROR ALERT ----------
  /**
   * Asserts that NO error alert appears (fails if one is detected).
   *
   * @param {string} [matchText] - Substring to match inside the alert. Pass "" to check any error alert.
   * @param {number} [timeoutMs] - How long to poll for alerts before assuming success. Default 4000ms.
   */
  async assertNoErrorAlert(matchText = "", timeoutMs = 4000) {
    const selector =
      "//div[contains(@class,'t-Alert') and (contains(.,'error') or contains(.,'ORA-'))] | " +
      "//div[contains(@class,'a-Notification') and (contains(.,'error') or contains(.,'ORA-'))] | " +
      "//*[@id='t_Alert_Notification'] | " +
      "//*[contains(text(),'error has occurred') or contains(text(),'error occurred')] | " +
      ".a-Notification--error, .t-Alert--danger, .t-Alert--error, .t-Alert--warning, .apex-page-error, #APEX_ERROR_MESSAGE, .htmldbStdErr, .a-Notification-item";

    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const frames = this.page.frames();

      for (const frame of frames) {
        let loc;
        try {
          loc = frame.locator(selector).first();
          const found = await loc.count().catch(() => 0);
          if (!found) continue;

          const visible = await loc.isVisible().catch(() => false);
          if (!visible) continue;

          const text = (await loc.innerText().catch(() => "")).trim();
          if (!text) continue;

          // Never treat success toasts as errors
          const isSuccess =
            (await loc.evaluate((el) => {
              const alertParent = el.closest(".t-Alert, .a-Notification");
              if (!alertParent) return false;
              return (
                alertParent.classList.contains("t-Alert--success") ||
                alertParent.classList.contains("a-Notification--success") ||
                alertParent.id === "t_Alert_Success"
              );
            }).catch(() => false)) ||
            (text.toLowerCase().includes("success") && !text.toLowerCase().includes("error"));

          if (isSuccess) continue;

          if (matchText && !text.toLowerCase().includes(matchText.toLowerCase())) {
            continue;
          }

          const detailItems = await loc
            .locator(".a-Notification-item, .htmldbStdErr")
            .allInnerTexts()
            .catch(() => []);
          const detail = detailItems.length ? ` -> ${detailItems.join("; ")}` : "";

          console.error(`[NegativeFormFiller] APEX error alert detected: "${text}"${detail}`);
          await expect(loc, `NegativeFormFiller: unexpected error alert visible: "${text}"${detail}`).not.toBeVisible({ timeout: 1000 });

          throw new Error(
            `NegativeFormFiller: unexpected error alert detected: "${text}"${detail}`,
          );
        } catch (err) {
          if (err.matcherResult || (err.message && (err.message.includes("NegativeFormFiller:") || err.message.includes("expect(")))) {
            throw err;
          }
        }
      }

      await this.page.waitForTimeout(250);
    }
  }
}

module.exports = { NegativeFormFiller };
