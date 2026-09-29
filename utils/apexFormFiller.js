/**
 * ApexFormFiller
 * ----------------
 * Reusable, self-discovering form filler for Oracle APEX forms in Playwright.
 *
 * Instead of hardcoding field IDs (which change per module), this scans a
 * "scope" locator for field TYPES and fills/tests them generically:
 *   - text inputs / textareas -> matched to `fieldData` by their <label>
 *                                 text (normalized); falls back to random
 *                                 lorem text if no label match is found.
 *   - selects                 -> use label-matched fieldData value when
 *                                 provided; otherwise randomly select a
 *                                 real option.
 *   - file inputs             -> uploads a static file path.
 *
 * Fields that don't exist in a given module are simply skipped, since the
 * locators just return 0 matches - no per-module config needed.
 *
 * LABEL MATCHING: pass `fieldData` as { "Incident Title": "some value", ... }
 * - keys are matched against each field's associated <label> text, case
 * -insensitively, with whitespace/asterisks normalized away. No `fieldData`
 * yet? Every text/textarea field just gets fixed dummy lorem text instead - this
 * is safe to use today and will start matching automatically once you pass
 * real data in.
 *
 * IMPORTANT: Always pass a `scope` that is limited to the create/edit form
 * region (a dialog, modal, or region div), NOT the whole `page`. Oracle APEX
 * pages often share one big <form> with header search boxes, filter fields,
 * etc. Scanning the whole page will pick those up too.
 */

// Fixed dummy text used for any text input/textarea whose label doesn't
// match an entry in fieldData. Deliberately NOT randomized - only dropdown
// selection uses Math.random(), per design.
const DUMMY_LOREM_TEXT =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

const { expect } = require("@playwright/test");

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
   * @param {import('@playwright/test').Locator} [options.scope] - Locator scoped to the form/region/dialog. Defaults to #t_Body_content (see note above).
   * @param {Object} [options.fieldData] - Map of label text -> value, e.g. { "Incident Title": "My title", "Severity": "High" }. Text/textarea and select fields whose <label> matches a key get that value; unmatched text fields get fixed dummy lorem text, unmatched selects get a random option.
   * @param {string} [options.filePath] - Static file path used for file uploads.
   * @param {boolean} [options.testBoundaries] - Whether to run min/max boundary tests on UNMATCHED textareas (lorem fallback only). Default true.
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

    // Label -> value lookup for text inputs/textareas. Keys are normalized
    // (lowercased, trimmed, asterisks/extra whitespace stripped) so data
    // like { "* Incident Title": "..." } and { "incident title": "..." }
    // both work the same. Empty until you call setFieldData() or pass
    // fieldData here - every text/textarea field just gets fixed dummy lorem
    // text until then, which is safe to run today.
    this.fieldData = {};
    if (options.fieldData) this.setFieldData(options.fieldData);


    // this.staticData = {
    //   filePath:
    //     options.filePath || "C:\\Users\\MOHAMMED ABUBAKER\\Desktop\\test-evidence.jpg",
    // };

    this.staticData = {
      filePath:
        options.filePath || process.env.EVIDENCE_FILE_PATH,
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

  /** Normalizes a label for matching: lowercase, strip required-asterisk, collapse whitespace. */
  _normalizeLabel(text) {
    return (text || "")
      .replace(/\*/g, "")
      .replace(/\((?:value required|optional|required)\)/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  /**
   * Load/replace the label -> value data map. Call this once your test
   * data file is ready, e.g. filler.setFieldData(require('./testData.json')).
   * Keys are normalized automatically, so you can write them however is
   * natural in your data file.
   */
  setFieldData(data) {
    this.fieldData = {};
    for (const [key, value] of Object.entries(data || {})) {
      const norm = this._normalizeLabel(key);
      this.fieldData[norm] = value;

      // Handle common APEX label aliases and suffix variations (e.g. "Site" vs "Site Name")
      if (norm.endsWith(" name")) {
        this.fieldData[norm.replace(/ name$/, "")] = value;
      } else {
        this.fieldData[`${norm} name`] = value;
      }
      if (norm.endsWith(" id")) {
        this.fieldData[norm.replace(/ id$/, "")] = value;
      }
      if (norm === "owner group" || norm === "owner group id") {
        this.fieldData["group"] = value;
      } else if (norm === "group") {
        this.fieldData["owner group"] = value;
      }
    }
  }

  /** Finds the <label for="..."> text for a given field, normalized. Returns null if none found. */
  async _getFieldLabel(field) {
    const id = await field.getAttribute("id").catch(() => null);

    let label = null;
    if (id) {
      if (this.scope && typeof this.scope.locator === "function") {
        label = this.scope.locator(`label[for='${id}']`);
        if ((await label.count().catch(() => 0)) === 0) {
          label = null;
        }
      }
      if (!label) {
        label = this.page.locator(`label[for='${id}']`);
        if ((await label.count().catch(() => 0)) === 0) label = null;
      }
    }

    if (!label) {
      const containerLabel = field.locator(
        "xpath=ancestor::*[contains(@class,'t-Form-fieldContainer') or contains(@class,'t-Form-item')][1]//label"
      );
      if ((await containerLabel.count().catch(() => 0)) > 0) {
        label = containerLabel.first();
      }
    }

    if (!label) {
      const ariaLabel = await field.getAttribute("aria-label").catch(() => null);
      if (ariaLabel) return this._normalizeLabel(ariaLabel);
      if (id) {
        return this._normalizeLabel(id.replace(/^P\d+_/, "").replace(/_/g, " "));
      }
      return null;
    }

    const text = (
      await label
        .first()
        .innerText()
        .catch(() => "")
    ).trim();
    if (text) return this._normalizeLabel(text);
    if (id) {
      return this._normalizeLabel(id.replace(/^P\d+_/, "").replace(/_/g, " "));
    }
    return null;
  }

  /** Lazily resolves the scope: explicit option > visible iframe/dialog > #t_Body_content > body */
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

  // ---------- TEXT INPUTS (label-matched, lorem fallback) ----------
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

      const label = await this._getFieldLabel(input);
      const matched = label !== null && this.fieldData[label] !== undefined;
      let text = matched ? String(this.fieldData[label]) : DUMMY_LOREM_TEXT;

      const maxLengthAttr = await input.getAttribute("maxlength");
      if (maxLengthAttr) {
        text = text.substring(0, parseInt(maxLengthAttr, 10));
      }
      await input.fill(text);
    }
  }

  // ---------- TEXTAREAS (label-matched, lorem fallback + boundary testing) ----------
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

      const label = await this._getFieldLabel(area);
      const matched = label !== null && this.fieldData[label] !== undefined;

      if (matched) {
        // Exact data match - fill it directly, no boundary mutation, since
        // we want the real value to end up in the field, not a stress-test
        // variant of it.
        let text = String(this.fieldData[label]);
        const maxLengthAttr = await area.getAttribute("maxlength");
        if (maxLengthAttr) {
          text = text.substring(0, parseInt(maxLengthAttr, 10));
        }
        await area.fill(text);
        continue;
      }

      // No data match - lorem fallback, optionally boundary-tested since
      // there's no "correct" value here to preserve anyway.
      const loremBase = DUMMY_LOREM_TEXT;
      if (this.testBoundaries) {
        await this._testTextAreaBoundaries(area, i, loremBase);
      } else {
        await area.fill(loremBase);
      }
    }
  }

  async _testTextAreaBoundaries(area, index, base) {
    const maxLenAttr = await area.getAttribute("maxlength");
    const minLenAttr = await area.getAttribute("minlength");
    const maxLength = maxLenAttr ? parseInt(maxLenAttr, 10) : null;
    const minLength = minLenAttr ? parseInt(minLenAttr, 10) : null;
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

  // ---------- DROPDOWNS (cascade-aware, label-matched with random fallback) ----------
  async selectDropdowns() {
    const selects = this.scope.locator("select:visible");
    const total = await selects.count();
    const handled = new Array(total).fill(false);

    // Multi-pass handling: cascading dropdowns populate options AFTER parent dropdown selection
    const maxPasses = 4;
    for (let pass = 0; pass < maxPasses; pass++) {
      let progressed = false;

      for (let i = 0; i < total; i++) {
        if (handled[i]) continue;

        const select = selects.nth(i);
        let isDisabled = await select.isDisabled().catch(() => true);

        // If disabled on early pass, wait briefly for parent dropdown's AJAX to enable it
        if (isDisabled) {
          const deadline = Date.now() + 1500;
          while (isDisabled && Date.now() < deadline) {
            await this.page.waitForTimeout(200);
            isDisabled = await select.isDisabled().catch(() => true);
          }
        }
        if (isDisabled) {
          if (pass === maxPasses - 1) handled[i] = true;
          continue;
        }

        // Get options for this select
        let options = await select.locator("option").evaluateAll((opts) =>
          opts.map((o, idx) => ({
            index: idx,
            text: (o.text || "").trim(),
            value: (o.value || "").trim(),
          }))
        );

        // Filter out empty options or default placeholder like "- Select -"
        let validOptions = options.filter(
          (o) =>
            o.text !== "" &&
            o.value !== "" &&
            !o.text.startsWith("- Select") &&
            !o.text.startsWith("%null%")
        );

        // If empty, wait up to 2.5s for cascading LOV options to arrive
        if (validOptions.length === 0) {
          const deadline = Date.now() + 2500;
          while (validOptions.length === 0 && Date.now() < deadline) {
            await this.page.waitForTimeout(250);
            options = await select.locator("option").evaluateAll((opts) =>
              opts.map((o, idx) => ({
                index: idx,
                text: (o.text || "").trim(),
                value: (o.value || "").trim(),
              }))
            );
            validOptions = options.filter(
              (o) =>
                o.text !== "" &&
                o.value !== "" &&
                !o.text.startsWith("- Select") &&
                !o.text.startsWith("%null%")
            );
          }
        }

        // If still no valid options on early pass, defer to next pass (cascading parent may populate it)
        if (validOptions.length === 0) {
          if (pass === maxPasses - 1) handled[i] = true;
          continue;
        }

        const label = await this._getFieldLabel(select);
        let requested = null;
        if (label && this.fieldData[label] !== undefined) {
          requested = this.fieldData[label];
        } else {
          // Check clean ID fallback if label didn't match directly
          const id = await select.getAttribute("id").catch(() => null);
          if (id) {
            const cleanId = this._normalizeLabel(id.replace(/^P\d+_/, "").replace(/_/g, " "));
            if (this.fieldData[cleanId] !== undefined) {
              requested = this.fieldData[cleanId];
            }
          }
        }

        const hasExplicitValue = requested !== null && requested !== undefined && String(requested).trim() !== "";
        let chosenOption = null;

        if (hasExplicitValue) {
          const reqStr = String(requested).trim();
          const reqLower = reqStr.toLowerCase();

          // 1. Exact match by text or value
          chosenOption = validOptions.find(
            (o) =>
              o.text.toLowerCase() === reqLower ||
              o.value.toLowerCase() === reqLower
          );

          // 2. Substring match (e.g. "Chemical Spill" for "Spill")
          if (!chosenOption) {
            chosenOption = validOptions.find(
              (o) =>
                o.text.toLowerCase().includes(reqLower) ||
                reqLower.includes(o.text.toLowerCase())
            );
          }

          // 3. Token match (e.g. "Spill/Leak" contains "spill" which matches "Chemical Spill")
          if (!chosenOption) {
            const tokens = reqLower.split(/[\s\/\-_]+/).filter((t) => t.length > 2);
            chosenOption = validOptions.find((o) => {
              const optLower = o.text.toLowerCase();
              return tokens.some((token) => optLower.includes(token));
            });
          }

          if (!chosenOption) {
            // If requested value cannot be matched on an early pass, defer in case cascading LOV changes options
            if (pass < maxPasses - 1) {
              continue;
            }
            // On final pass, fall back to random valid option so form can submit
            console.warn(
              `[ApexFormFiller] Dropdown "${label || 'unnamed'}": Explicit value "${requested}" not found in options [${validOptions.map(o => o.text).join(", ")}]. Selecting random fallback.`
            );
            const randomIndex = Math.floor(Math.random() * validOptions.length);
            chosenOption = validOptions[randomIndex];
          }
        } else {
          // No explicit value: random selection among valid options
          const randomIndex = Math.floor(Math.random() * validOptions.length);
          chosenOption = validOptions[randomIndex];
        }

        if (chosenOption) {
          await select.selectOption({ index: chosenOption.index });
          await select.dispatchEvent("change").catch(() => {});
          await this.page.waitForTimeout(300);
          await this.page.waitForLoadState("networkidle").catch(() => {});
          handled[i] = true;
          progressed = true;
        }
      }

      if (handled.every(Boolean)) break;

      // If nothing progressed on this pass, but there are unhandled dropdowns with valid options:
      // Pick a random option for the first unhandled dropdown to kick off any cascading dependency
      if (!progressed) {
        let kickStarted = false;
        for (let i = 0; i < total; i++) {
          if (handled[i]) continue;
          const select = selects.nth(i);
          const validOptions = await select.locator("option").evaluateAll((opts) =>
            opts
              .map((o, idx) => ({ index: idx, text: (o.text || "").trim(), value: (o.value || "").trim() }))
              .filter((o) => o.text !== "" && o.value !== "" && !o.text.startsWith("- Select") && !o.text.startsWith("%null%"))
          );
          if (validOptions.length > 0) {
            const chosen = validOptions[Math.floor(Math.random() * validOptions.length)];
            await select.selectOption({ index: chosen.index });
            await select.dispatchEvent("change").catch(() => {});
            await this.page.waitForTimeout(300);
            await this.page.waitForLoadState("networkidle").catch(() => {});
            handled[i] = true;
            kickStarted = true;
            break;
          }
        }
        if (!kickStarted) break;
      }
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
        await toggle.click({ force: true }).catch(() => { });
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
          await this.page.waitForTimeout(500);
        } catch {
          try {
            const fileChooserPromise = this.page.waitForEvent("filechooser", { timeout: 2500 });
            await fileInput.click({ force: true });
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(this.staticData.filePath);
            await this.page.waitForTimeout(500);
          } catch {
            // Optional file upload or hidden input, safe to proceed
          }
        }
      }
    }
  }
  // ---------- POST-SUBMIT ERROR CHECK ----------
  /**
   * Call this right after clicking Create/Save/OK to fail the test if
   * Oracle APEX shows an error alert/notification. Actively WAITS for the
   * alert to appear (rather than a single point-in-time check), since APEX's
   * notification toast can take a moment to render/animate in.
   *
   * The text to match is now the caller's responsibility (no hardcoded
   * default here) - pass it explicitly from your test file, e.g.
   * `filler.assertNoErrorAlert("error has occurred")`. Pass "" to fail on
   * ANY visible error alert regardless of its wording.
   *
   * @param {string} matchText - Substring to match inside the alert text (case-insensitive). Pass "" to match any visible alert.
   * @param {number} [timeoutMs] - How long to wait for an alert to appear before assuming success. Default 4000ms.
   */
  async assertNoErrorAlert(matchText = "", timeoutMs = 4000) {
    // Oracle APEX Universal Theme renders validation/error messages inside
    // a standard ".a-Notification--error" block (wrapped in ".t-Alert-body"
    // with role="alert"). ".t-Alert-content" is the wrapping element around
    // that in some layouts - included here too. This markup comes from the
    // theme itself, so it's identical across every module - no per-module
    // selector needed.
    const selector =
      "//div[contains(@class,'t-Alert') and (contains(.,'error') or contains(.,'ORA-'))] | " +
      "//div[contains(@class,'a-Notification') and (contains(.,'error') or contains(.,'ORA-'))] | " +
      "//*[@id='t_Alert_Notification'] | " +
      "//*[contains(text(),'error has occurred') or contains(text(),'error occurred')] | " +
      ".a-Notification--error, .t-Alert--danger, .t-Alert--error, .t-Alert--warning, .apex-page-error, #APEX_ERROR_MESSAGE, .htmldbStdErr, .a-Notification-item";

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

          if (isSuccess) {
            continue;
          }

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

          console.error(`[APEX ERROR ALERT] Detected error alert: "${text}"${detail}`);
          await expect(loc, `ApexFormFiller: form submission failed - error alert visible: "${text}"${detail}`).not.toBeVisible({ timeout: 1000 });

          throw new Error(
            `ApexFormFiller: form submission failed - alert detected: "${text}"${detail}`,
          );
        } catch (err) {
          if (err.matcherResult || (err.message && (err.message.includes("ApexFormFiller:") || err.message.includes("expect(")))) {
            throw err; // real failure - propagate up and fail the test immediately
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
