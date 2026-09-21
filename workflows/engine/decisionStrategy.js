/**
 * Decision Strategy Manager
 * -------------------------
 * Determines which action to select during review/decision states.
 * Supports:
 *  - "approve": Always choose approve
 *  - "reject": Always choose reject
 *  - "sendBack": Always choose sendBack
 *  - "sendBackThenApprove": 1st pass chooses sendBack, subsequent passes choose approve
 *  - Sequence: Array of predetermined actions, e.g. ["sendBack", "approve"]
 *  - Controlled Seeded Random: Pseudo-random choice using PRNG seed, with auto-mitigation
 *    to prevent infinite loops.
 */

// Simple Linear Congruential Generator (LCG) for reproducible pseudo-random numbers
class SeededRandom {
  constructor(seed = 123456789) {
    this.seed = typeof seed === "number" ? seed : this._hashString(String(seed));
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  next() {
    // Standard LCG constants
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
}

class DecisionStrategy {
  /**
   * @param {string|Object} strategy - Strategy name or config object
   * @param {number|string} [seed] - Optional PRNG seed
   */
  constructor(strategy = "approve", seed = Date.now()) {
    this.strategy = strategy;
    this.seed = seed;
    this.prng = new SeededRandom(seed);
  }

  /**
   * Chooses an action from the available actions for the given state.
   *
   * @param {Object} params
   * @param {string} params.stateName - Name of the current workflow state
   * @param {string[]} params.availableActions - Configured actions for this state (e.g. ['approve', 'reject', 'sendBack'])
   * @param {number} params.stateVisitCount - How many times this state has been visited so far
   * @param {Object} [params.customStrategy] - Per-state override strategy if provided
   * @returns {string} Selected action
   */
  selectAction({ stateName, availableActions = [], stateVisitCount = 1, customStrategy = null }) {
    if (!availableActions.length) {
      throw new Error(`DecisionStrategy: No available actions defined for state "${stateName}".`);
    }

    if (availableActions.length === 1) {
      return availableActions[0];
    }

    const strat = customStrategy || this.strategy;

    // 1. Direct action match (e.g. strategy: "approve", "reject", "sendBack")
    if (typeof strat === "string") {
      const lower = strat.toLowerCase();

      if (availableActions.includes(lower)) {
        return lower;
      }

      if (lower === "sendbackthenapprove") {
        if (stateVisitCount === 1 && availableActions.includes("sendBack")) {
          return "sendBack";
        }
        if (availableActions.includes("approve")) {
          return "approve";
        }
        return availableActions[0];
      }

      if (lower === "rejectthenapproveclosure") {
        if (stateVisitCount === 1 && availableActions.includes("reject")) {
          return "reject";
        }
        if (availableActions.includes("approve")) {
          return "approve";
        }
        return availableActions[0];
      }

      if (lower === "random") {
        return this._pickRandom(availableActions, stateVisitCount);
      }
    }

    // 2. Explicit sequence object: { type: "sequence", actions: ["sendBack", "approve"] }
    if (typeof strat === "object" && strat !== null) {
      if (strat.type === "sequence" && Array.isArray(strat.actions)) {
        const index = Math.min(stateVisitCount - 1, strat.actions.length - 1);
        const action = strat.actions[index];
        if (availableActions.includes(action)) {
          return action;
        }
      }

      if (strat.type === "weightedRandom" && strat.weights) {
        return this._pickWeightedRandom(availableActions, strat.weights, stateVisitCount);
      }
    }

    // Fallback: Pick first available action
    return availableActions[0];
  }

  _pickRandom(availableActions, stateVisitCount) {
    // If we have looped through this state more than 2 times, bias away from sendBack
    // to prevent potential infinite loops during random exploration
    let pool = [...availableActions];
    if (stateVisitCount > 2 && pool.includes("sendBack") && pool.length > 1) {
      pool = pool.filter((a) => a !== "sendBack");
    }

    const index = Math.floor(this.prng.next() * pool.length);
    return pool[index];
  }

  _pickWeightedRandom(availableActions, weights, stateVisitCount) {
    const validWeights = {};
    let totalWeight = 0;

    for (const action of availableActions) {
      let weight = weights[action] !== undefined ? weights[action] : 1;
      // Loop damping
      if (stateVisitCount > 2 && action === "sendBack") {
        weight = 0;
      }
      validWeights[action] = weight;
      totalWeight += weight;
    }

    if (totalWeight <= 0) {
      return availableActions[0];
    }

    let threshold = this.prng.next() * totalWeight;
    for (const action of availableActions) {
      threshold -= validWeights[action];
      if (threshold <= 0) {
        return action;
      }
    }

    return availableActions[0];
  }
}

module.exports = { DecisionStrategy, SeededRandom };
