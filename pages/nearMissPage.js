/**
 * Near-Miss Reporting & Analysis Module Page Definitions & Locators
 * -----------------------------------------------------------------
 * Maps semantic keys for the Near-Miss operational workflow:
 * Reporting Entry -> Initial Submission -> Review & Classify -> Investigation & RCA -> CAPA -> Closure Governance
 */

const { defaultRegistry } = require("./pageRegistry");

function registerNearMissPages(registry = defaultRegistry) {
  // Pages
  registry.registerPage("nearMissLanding", {
    iconLocator: "//span[contains(@class,'fa-warning') or contains(@class,'fa-exclamation-triangle') or contains(@class,'fa-eye')]",
    headerLocator: "//h1[contains(.,'Near-Miss') or contains(.,'Near Miss') or contains(.,'Observation')]",
    expectedTitle: "Near-Miss",
  });

  registry.registerPage("nearMissReporting", {
    triggerLocator: "//button[contains(.,'Report a Near-Miss') or contains(.,'New Near-Miss') or contains(.,'Report Near Miss')]",
    headerLocator: "//h1[contains(.,'Report a Near-Miss') or contains(.,'Near-Miss Entry')]",
    expectedTitle: "Near-Miss",
  });

  registry.registerPage("nearMissReview", {
    headerLocator: "//h1[contains(.,'Pending Review Queue') or contains(.,'Review & Classify')]",
    expectedTitle: "Review",
  });

  registry.registerPage("nearMissInvestigation", {
    headerLocator: "//h1[contains(.,'Investigation') or contains(.,'RCA Wizard')]",
    expectedTitle: "Investigation",
  });

  registry.registerPage("nearMissClosure", {
    headerLocator: "//h1[contains(.,'Closure Review') or contains(.,'Closure Governance')]",
    expectedTitle: "Closure",
  });

  // Locators
  registry.registerLocators({
    reportNearMissButton: "//button[contains(.,'Report a Near-Miss') or contains(.,'New Near-Miss') or contains(.,'Report Near Miss') or normalize-space()='Create']",
    submitNearMissButton: "//button[contains(.,'Submit Near-Miss') or contains(.,'Confirm Submission') or normalize-space()='Submit']",
    nearMissSaveDraftButton: "//button[contains(.,'Save Draft') or normalize-space()='Save as Draft']",

    // Classification Actions
    approveForInvestigationButton: "//button[contains(.,'Approve for Investigation') or contains(.,'Assign Investigator') or normalize-space()='Approve']",
    rejectDuplicateButton: "//button[contains(.,'Reject as Duplicate') or contains(.,'Close as Invalid') or normalize-space()='Reject']",
    sendBackClarificationButton: "//button[contains(.,'Request Clarification') or contains(.,'Send Back') or normalize-space()='Send Back']",

    // Investigation & CAPA
    completeRcaButton: "//button[contains(.,'Complete RCA') or contains(.,'Save Investigation') or normalize-space()='Complete']",
    createCapaButton: "//button[contains(.,'Create CAPA') or contains(.,'Link CAPA') or normalize-space()='Create CAPA']",

    // Closure Governance
    approveNearMissClosureButton: "//button[contains(.,'Approve Closure') or normalize-space()='Close Successfully']",
    reopenNearMissButton: "//button[contains(.,'Reopen') or contains(.,'Rework') or normalize-space()='Reopen Case']",
    nearMissCommentInput: "#P_NM_COMMENT, textarea[name*='COMMENT'], textarea[name*='REASON']",
  });
}

registerNearMissPages(defaultRegistry);

module.exports = { registerNearMissPages };
