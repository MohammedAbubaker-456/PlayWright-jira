/**
 * Step Handler Registry
 * ---------------------
 * Dispatches state types to their corresponding step implementation.
 */

const { executeStepForm } = require("../steps/stepForm");
const { executeStepSubmit } = require("../steps/stepSubmit");
const { executeStepReview } = require("../steps/stepReview");
const { executeStepAssignment } = require("../steps/stepAssignment");
const { executeStepClosureInitiation, executeStepClosureReview } = require("../steps/stepClosure");
const { executeStepAction } = require("../steps/stepAction");
const { executeStepTableAction } = require("../steps/stepTableAction");

const handlers = {
  form: executeStepForm,
  submit: executeStepSubmit,
  review: executeStepReview,
  assignment: executeStepAssignment,
  action: executeStepAction,
  click: executeStepAction,
  tab: executeStepAction,
  tableaction: executeStepTableAction,
  selectrow: executeStepTableAction,
  closureinitiation: executeStepClosureInitiation,
  closurereview: executeStepClosureReview,
  closure: executeStepClosureReview,

  decision: async (page, state, context) => {
    let result = "yes";
    if (typeof state.evaluate === "function") {
      result = await state.evaluate(page, context);
    } else if (state.conditionLocator) {
      const loc = context.pageRegistry
        ? context.pageRegistry.getLocator(page, state.conditionLocator) || page.locator(state.conditionLocator)
        : page.locator(state.conditionLocator);
      const isVisible = await loc.isVisible().catch(() => false);
      result = isVisible ? "yes" : "no";
    }

    const nextState = state.transitions?.[result] || state.next;
    return {
      actionTaken: `DECISION_${result.toUpperCase()}`,
      nextState,
      details: { decision: result },
    };
  },

  complete: async (page, state, context) => ({
    actionTaken: "COMPLETED",
    isTerminal: true,
    nextState: null,
  }),

  rejected: async (page, state, context) => ({
    actionTaken: "REJECTED",
    isTerminal: true,
    nextState: null,
  }),

  closed: async (page, state, context) => ({
    actionTaken: "CLOSED",
    isTerminal: true,
    nextState: null,
  }),
};

class StepHandlerRegistry {
  /**
   * Registers or overrides a step type handler.
   *
   * @param {string} type
   * @param {Function} handlerFn
   */
  static register(type, handlerFn) {
    handlers[type.toLowerCase()] = handlerFn;
  }

  /**
   * Dispatches the execution of a state.
   *
   * @param {import('@playwright/test').Page} page
   * @param {Object} state
   * @param {Object} context
   * @returns {Promise<Object>} Step execution result
   */
  static async execute(page, state, context) {
    const type = (state.type || "").toLowerCase();
    const handler = handlers[type];

    if (!handler) {
      throw new Error(`StepHandlerRegistry: Unknown workflow state type "${state.type}" in state "${context.currentState}".`);
    }

    return await handler(page, state, context);
  }
}

module.exports = { StepHandlerRegistry };
