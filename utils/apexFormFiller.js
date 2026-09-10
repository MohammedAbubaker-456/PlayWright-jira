/**
 * ApexFormFiller
 * ----------------
 * Reusable, self-discovering form filler for Oracle APEX forms in Playwright.
 *
 * Instead of hardcoding field IDs (which change per module), this scans a
 * "scope" locator for field TYPES and fills/tests them generically:
 *   - text inputs      -> static title text (trimmed to maxlength if set)
 *   - textareas        -> boundary tested (below-min / at-max / over-max)
 *   - selects           -> always picks the 2nd option (index 1)
 *   - file inputs      -> uploads a static file path
 *
 * Fields that don't exist in a given module are simply skipped, since the
 * locators just return 0 matches - no per-module config needed.
 *
 * IMPORTANT: Always pass a `scope` that is limited to the create/edit form
 * region (a dialog, modal, or region div), NOT the whole `page`. Oracle APEX
 * pages often share one big <form> with header search boxes, filter fields,
 * etc. Scanning the whole page will pick those up too.
 */

class ApexFormFiller {
  /**
   * Auto-detect the form scope by walking up from a known field on the page
   * (e.g. the title input) to the nearest dialog/modal/region ancestor.
   * Use this when you don't want to hardcode a region id per module.
   *
   * @param {import('@playwright/test').Page} page
   * @param {string} anchorSelector - XPath/CSS selector for any field known to be inside the form (e.g. the title input).
   * @returns {import('@playwright/test').Locator}
   */
  static autoScope(page, anchorSelector) {
    return page
      .locator(anchorSelector)
      .locator(
        "xpath=ancestor::*[@role='dialog' or contains(@class,'dialog') or contains(@class,'t-Dialog') or contains(@class,'apex-dialog') or contains(@class,'t-Region')][1]",
      );
  }

  /**
   * @param {import('@playwright/test').Page} page
   * @param {Object} options
   * @param {import('@playwright/test').Locator} [options.scope] - Locator scoped to the form/region/dialog. Defaults to `page` (not recommended - see note above).
   * @param {string} [options.title] - Static text used for single-line text inputs.
   * @param {string} [options.description] - Static text used for textareas.
   * @param {string} [options.filePath] - Static file path used for file uploads.
   * @param {boolean} [options.testBoundaries] - Whether to run min/max boundary tests on textareas. Default true.
   * @param {number} [options.dialogWaitMs] - Wait after each dropdown select, to allow cascading LOVs to settle. Default handled via waitForLoadState.
   */
  constructor(page, options = {}) {
    this.page = page;
    // If no scope is given, default to Oracle APEX Universal Theme's main
    // content wrapper (#t_Body_content). This id is part of the theme
    // template itself - present on every module's page - and already
    // excludes the top nav/header icons, so it works across modules
    // without per-module configuration. Falls back to <body> if the app
    // isn't using Universal Theme (or the id was customized).
    this.scope = options.scope || null; // resolved lazily in _resolveScope()

    this.staticData = {
      title: options.title || "This is for testing purpose (Automation)",
      description:
        options.description ||
        "This record is being created for automated testing purposes.",
      filePath:
        options.filePath || "C:/Users/Public/Pictures/test-evidence.jpg",
    };

    this.testBoundaries =
      options.testBoundaries === undefined ? true : options.testBoundaries;

    // Whether to auto-enable boolean toggle/switch fields (default true).
    // Set to false if a module's toggles shouldn't be touched by the filler.
    this.enableToggles =
      options.enableToggles === undefined ? true : options.enableToggles;

    // Collects issues found during boundary testing, so you can assert on them
    this.validationIssues = [];
  }

  /** Lazily resolves the scope: explicit option > #t_Body_content > body */
  async _resolveScope() {
    if (this.scope) return this.scope;

    const universalThemeContent = this.page.locator("#t_Body_content");
    if ((await universalThemeContent.count()) > 0) {
      this.scope = universalThemeContent;
    } else {
      this.scope = this.page.locator("body");
    }
    return this.scope;
  }

  /** Runs the full fill sequence: text -> textareas -> dropdowns -> file upload */
  async fillAll() {
    await this._resolveScope();

    const fieldCount = await this.scope
      .locator("input, textarea, select")
      .count();
    if (fieldCount === 0) {
      throw new Error(
        "ApexFormFiller: scope matched 0 form fields. Check that the scope " +
          "locator actually wraps the visible form (e.g. wrong region id, " +
          "or the form hasn't finished loading yet).",
      );
    }

    await this.fillTextInputs();
    await this.fillTextAreas();
    await this.selectDropdowns();
    await this.fillToggles();
    await this.uploadFiles();
    return this.validationIssues;
  }

  // ---------- TEXT INPUTS ----------
  async fillTextInputs() {
    // APEX generates class "apex-item-text" on single-line text items.
    // Fallback to input[type=text] if the theme doesn't use that class.
    let inputs = this.scope.locator("input.apex-item-text:visible");
    if ((await inputs.count()) === 0) {
      inputs = this.scope.locator("input[type='text']:visible");
    }

    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      if (await input.isDisabled()) continue;
      if (await input.getAttribute("readonly")) continue;

      const maxLengthAttr = await input.getAttribute("maxlength");
      let text = this.staticData.title;
      if (maxLengthAttr) {
        text = text.substring(0, parseInt(maxLengthAttr, 10));
      }
      await input.fill(text);
    }
  }

  // ---------- TEXTAREAS (with boundary testing) ----------
  async fillTextAreas() {
    let areas = this.scope.locator("textarea.apex-item-textarea:visible");
    if ((await areas.count()) === 0) {
      areas = this.scope.locator("textarea:visible");
    }

    const count = await areas.count();
    for (let i = 0; i < count; i++) {
      const area = areas.nth(i);
      if (await area.isDisabled()) continue;
      if (await area.getAttribute("readonly")) continue;

      if (this.testBoundaries) {
        await this._testTextAreaBoundaries(area, i);
      } else {
        await area.fill(this.staticData.description);
      }
    }
  }

  async _testTextAreaBoundaries(area, index) {
    const maxLenAttr = await area.getAttribute("maxlength");
    const minLenAttr = await area.getAttribute("minlength");
    const maxLength = maxLenAttr ? parseInt(maxLenAttr, 10) : null;
    const minLength = minLenAttr ? parseInt(minLenAttr, 10) : null;
    const base = this.staticData.description;
    const repeatToLength = (str, len) =>
      str.repeat(Math.ceil(len / str.length)).substring(0, len);

    // 1. Below minimum (if a minlength is declared)
    if (minLength && minLength > 0) {
      const belowMin = repeatToLength(base, Math.max(minLength - 1, 0));
      await area.fill(belowMin);
      await area.blur();
      const actual = await area.inputValue();
      if (actual.length >= minLength) {
        this.validationIssues.push(
          `Textarea[${index}]: expected value shorter than minlength(${minLength}) to be accepted for testing, got length ${actual.length}`,
        );
      }
    }

    // 2. Valid value at (or under, if no maxlength) the limit
    const validText = maxLength ? repeatToLength(base, maxLength) : base;
    await area.fill(validText);
    await area.blur();

    // 3. Above maximum (if a maxlength is declared)
    if (maxLength) {
      const overMax = repeatToLength(base, maxLength + 20);
      await area.fill(overMax);
      const actual = await area.inputValue();
      if (actual.length > maxLength) {
        this.validationIssues.push(
          `Textarea[${index}]: maxlength=${maxLength} not enforced by the field, accepted ${actual.length} chars`,
        );
      }
      // Reset to a valid value so the rest of the form can still submit
      await area.fill(validText);
    }
  }

  // ---------- DROPDOWNS (cascade-aware) ----------
  async selectDropdowns() {
    let selects = this.scope.locator("select.apex-item-select:visible");
    if ((await selects.count()) === 0) {
      selects = this.scope.locator("select:visible");
    }

    const total = await selects.count();
    const handled = new Array(total).fill(false);

    // Multiple passes: some dropdowns (like Zone/Location/Category) only
    // populate their options AFTER a parent dropdown (Site/Area/Emergency
    // Type) has been selected and its AJAX call has returned. A single
    // left-to-right pass can hit a downstream field before its options
    // exist yet, so we retry unresolved fields across a few passes.
    const maxPasses = 4;
    for (let pass = 0; pass < maxPasses; pass++) {
      let progressed = false;

      for (let i = 0; i < total; i++) {
        if (handled[i]) continue;

        const select = selects.nth(i);
        if (await select.isDisabled().catch(() => true)) {
          handled[i] = true; // disabled fields are never going to become fillable
          continue;
        }

        let optionCount = await select.locator("option").count();

        // If this field looks empty right now, give it a short window to
        // populate (cascading AJAX) before deciding to skip it this pass.
        if (optionCount <= 1) {
          const deadline = Date.now() + 2000;
          while (optionCount <= 1 && Date.now() < deadline) {
            await this.page.waitForTimeout(250);
            optionCount = await select.locator("option").count();
          }
        }

        if (optionCount > 1) {
          await select.selectOption({ index: 1 }); // index 0 is usually "- Select -"
          await this.page.waitForLoadState("networkidle").catch(() => {});
          handled[i] = true;
          progressed = true;
        }
      }

      if (!progressed) break; // nothing new became fillable this pass, stop early
    }
  }

  // ---------- TOGGLE SWITCHES ----------
  /**
   * Handles boolean toggle/switch fields (rendered as input[type=checkbox]
   * under the hood, even when styled as a slider). Turns each one ON.
   * Set `enableToggles: false` in the constructor options to skip these
   * entirely if a module's toggles shouldn't be touched.
   */
  async fillToggles() {
    if (this.enableToggles === false) return;

    const toggles = this.scope.locator("input[type='checkbox']:visible");
    const count = await toggles.count();

    for (let i = 0; i < count; i++) {
      const toggle = toggles.nth(i);
      if (await toggle.isDisabled().catch(() => true)) continue;

      const alreadyChecked = await toggle.isChecked().catch(() => false);
      if (alreadyChecked) continue;

      try {
        await toggle.check({ force: true });
      } catch {
        // Some custom switch widgets aren't reliably checkable via .check();
        // fall back to a direct click on the same element.
        await toggle.click({ force: true }).catch(() => {});
      }
    }
  }

  // ---------- FILE UPLOADS ----------
  async uploadFiles() {
    const fileInputs = this.scope.locator("input[type='file']");
    const count = await fileInputs.count();

    for (let i = 0; i < count; i++) {
      const fileInput = fileInputs.nth(i);

      // APEX's multi-file-upload plugin often hides the real <input type=file>
      // and triggers it via a visible button/icon that opens the OS file picker.
      const fileChooserPromise = this.page.waitForEvent("filechooser");
      await fileInput.click({ force: true });
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(this.staticData.filePath);
      await this.page.waitForTimeout(1000);
    }
  }
  // ---------- POST-SUBMIT ERROR CHECK ----------
  /**
   * Call this right after clicking Create/Save/OK (and after the page has
   * settled) to fail the test if Oracle APEX shows an error alert.
   *
   * By default it looks for the text "error has occurred" (case-insensitive)
   * inside any visible alert/error region. Pass a different substring via
   * `matchText` if a module surfaces a different phrase, or pass an empty
   * string to fail on ANY visible error alert regardless of its wording.
   *
   * @param {string} [matchText] - Substring to match inside the alert text. Default: "error has occurred".
   */
  /**
   * Call this right after clicking Create/Save/OK to fail the test if
   * Oracle APEX shows an error alert/notification. Actively WAITS for the
   * alert to appear (rather than a single point-in-time check), since APEX's
   * notification toast can take a moment to render/animate in.
   *
   * @param {string} [matchText] - Substring to match inside the alert text. Default: "error has occurred". Pass "" to fail on ANY visible alert regardless of wording.
   * @param {number} [timeoutMs] - How long to wait for an alert to appear before assuming success. Default 4000ms.
   */
  async assertNoErrorAlert(matchText = "error has occurred", timeoutMs = 4000) {
    // Oracle APEX Universal Theme renders validation/error messages inside
    // a standard ".a-Notification--error" block (wrapped in ".t-Alert-body"
    // with role="alert"). This markup comes from the theme itself, so it's
    // identical across every module - no per-module selector needed.
    const selector =
      ".a-Notification--error, .t-Alert-body[role='alert'], [role='alert'], .t-Alert--danger, .apex-page-error, #APEX_ERROR_MESSAGE";

    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      // Search the main document AND every iframe on the page - some APEX
      // dialog/page setups render the form (and its error alert) inside an
      // iframe, which page.locator() alone would never see.
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
          if (
            matchText &&
            !text.toLowerCase().includes(matchText.toLowerCase())
          ) {
            continue;
          }

          const detailItems = await loc
            .locator(".a-Notification-item, .htmldbStdErr")
            .allInnerTexts()
            .catch(() => []);
          const detail = detailItems.length
            ? ` -> ${detailItems.join("; ")}`
            : "";

          throw new Error(
            `ApexFormFiller: form submission failed - alert detected: "${text}"${detail}`,
          );
        } catch (err) {
          if (err.message && err.message.startsWith("ApexFormFiller:")) {
            throw err; // real failure - propagate up and fail the test
          }
          // otherwise a frame navigated away / got detached mid-check - ignore and keep polling
        }
      }

      await this.page.waitForTimeout(250);
    }
    // No alert found within timeoutMs across any frame - treat as success.
  }
}

module.exports = { ApexFormFiller };
