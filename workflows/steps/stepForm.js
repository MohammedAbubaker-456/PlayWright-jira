/**
 * Step Form Handler
 * -----------------
 * Handles state type: "form".
 * Extracts matching field data from testData and delegates to ApexFormFiller.
 */

const { ApexFormFiller } = require("../../utils/apexFormFiller");

async function executeStepForm(page, state, context) {
  const formKey = state.formKey || state.form;
  let fieldData = null;

  if (formKey && context.testData && context.testData[formKey]) {
    fieldData = context.testData[formKey];
  } else if (context.testData && typeof context.testData === "object" && !Array.isArray(context.testData)) {
    // If testData itself is the key-value dictionary
    fieldData = context.testData;
  }

  // Resolve scope locator if configured
  let scope = null;
  if (state.scope) {
    if (context.pageRegistry && typeof context.pageRegistry.getLocator === "function") {
      scope = context.pageRegistry.getLocator(page, state.scope);
    }
    if (!scope) {
      scope = page.locator(state.scope);
    }
  }

  const fillerOptions = {
    scope: scope || undefined,
    fieldData: fieldData || undefined,
    filePath: state.filePath || (context.options && context.options.filePath) || undefined,
    enableToggles: state.enableToggles !== undefined ? state.enableToggles : true,
    testBoundaries: state.testBoundaries !== undefined ? state.testBoundaries : false,
  };

  const filler = new ApexFormFiller(page, fillerOptions);

  console.log(`[WORKFLOW] [FORM] Filling form with ${fieldData ? Object.keys(fieldData).length : 0} defined fields...`);
  const issues = await filler.fillAll();

  if (issues && issues.length) {
    console.warn(`[WORKFLOW] [FORM] Field boundary/validation warnings:`, issues);
  }

  await page.waitForLoadState("networkidle").catch(() => {});

  return {
    actionTaken: "FORM_FILLED",
    nextState: state.next,
    details: {
      formKey,
      fieldsProvided: fieldData ? Object.keys(fieldData) : [],
      issues,
    },
  };
}

module.exports = { executeStepForm };
