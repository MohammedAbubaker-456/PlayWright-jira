/**
 * Hazmat Module Page Definitions & Locators
 * -----------------------------------------
 * Maps semantic keys for the Hazardous Material Management (HMM)
 * Chemical Master Approval workflow to Oracle APEX Universal Theme elements.
 */

const { defaultRegistry } = require("./pageRegistry");

function registerHazmatPages(registry = defaultRegistry) {
  // 1. Register Pages
  registry.registerPage("hazmatRegister", {
    iconLocator: "//span[contains(@class,'fa-flask') or contains(@class,'fa-cubes') or contains(@class,'fa-file-text-o')]",
    headerLocator: "//h1[contains(.,'Chemical') or contains(.,'Hazmat') or contains(.,'Dashboard')]",
    expectedTitle: "Chemical",
  });

  registry.registerPage("chemicalCreate", {
    triggerLocator: "//button[contains(.,'Create Chemical') or contains(.,'New Chemical') or contains(.,'Add Chemical')]",
    headerLocator: "//h1[contains(.,'Create Chemical') or contains(.,'New Chemical')]",
    expectedTitle: "Chemical",
  });

  registry.registerPage("chemicalApproval", {
    headerLocator: "//h1[contains(.,'Approval') or contains(.,'Review') or contains(.,'Pending')]",
    expectedTitle: "Approval",
  });

  registry.registerPage("chemicalEdit", {
    headerLocator: "//h1[contains(.,'Edit') or contains(.,'Update')]",
    expectedTitle: "Edit",
  });

  registry.registerPage("restrictedChemicalsList", {
    headerLocator: "//h1[contains(.,'Chemical') or contains(.,'Restricted') or contains(.,'Register')]",
  });

  // 2. Register Locators
  registry.registerLocators({
    // Chemical Register
    newChemicalButton: "//button[contains(.,'Create Chemical') or contains(.,'New Chemical') or contains(.,'Add Chemical') or normalize-space()='Create']",
    chemicalSearchInput: "#P_SEARCH_CHEMICAL, input[placeholder*='Search Chemical']",

    // Chemical Create / Submit
    submitForApprovalButton: "//button[contains(.,'Submit for Approval') or normalize-space()='Submit' or normalize-space()='Create']",
    saveDraftButton: "//button[contains(.,'Save as Draft') or normalize-space()='Draft']",

    // Chemical Approval & Review
    approveButton: "//button[contains(.,'Approve Chemical') or normalize-space()='Approve']",
    rejectButton: "//button[contains(.,'Reject Chemical') or normalize-space()='Reject']",
    sendBackButton: "//button[contains(.,'Return for Update') or contains(.,'Send Back') or normalize-space()='Return']",

    // Chemical Edit / Resubmit
    resubmitButton: "//button[contains(.,'Re-submit') or contains(.,'Update & Submit') or contains(.,'Submit for Approval') or normalize-space()='Submit']",

    // Review comments
    reviewCommentInput: "#P_REVIEW_COMMENT, textarea[name*='COMMENT'], textarea[name*='REASON']",
  });
}

// Auto-register on require
registerHazmatPages(defaultRegistry);

module.exports = { registerHazmatPages };
