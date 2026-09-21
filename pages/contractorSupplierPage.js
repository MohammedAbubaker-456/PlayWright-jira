/**
 * Contractor & Supplier Management Module (CSM) Page Definitions & Locators
 * ------------------------------------------------------------------------
 * Maps semantic keys for the CSM operational workflow:
 * Onboarding Request -> Master Profile -> Review & Approval -> Compliance & Readiness -> Site Access
 */

const { defaultRegistry } = require("./pageRegistry");

function registerContractorSupplierPages(registry = defaultRegistry) {
  // Pages
  registry.registerPage("csmLanding", {
    iconLocator: "//span[contains(@class,'fa-handshake-o') or contains(@class,'fa-truck') or contains(@class,'fa-users')]",
    headerLocator: "//h1[contains(.,'Contractor') or contains(.,'Supplier') or contains(.,'CSM')]",
    expectedTitle: "Contractor",
  });

  registry.registerPage("csmOnboardingRequest", {
    triggerLocator: "//button[contains(.,'New Request') or contains(.,'Onboard Contractor') or contains(.,'Create Request')]",
    headerLocator: "//h1[contains(.,'Onboarding') or contains(.,'New Request')]",
    expectedTitle: "Onboarding",
  });

  registry.registerPage("csmReviewApproval", {
    headerLocator: "//h1[contains(.,'Review') or contains(.,'Approval') or contains(.,'Workbench')]",
    expectedTitle: "Review",
  });

  registry.registerPage("csmDocumentControl", {
    headerLocator: "//h1[contains(.,'Document') or contains(.,'Certification')]",
    expectedTitle: "Document",
  });

  registry.registerPage("csmSiteAccess", {
    headerLocator: "//h1[contains(.,'Site Access') or contains(.,'Readiness')]",
    expectedTitle: "Readiness",
  });

  // Locators
  registry.registerLocators({
    newOnboardingButton: "//button[contains(.,'New Request') or contains(.,'Onboard Contractor') or contains(.,'Create Request') or normalize-space()='Create']",
    submitOnboardingButton: "//button[contains(.,'Submit for Review') or contains(.,'Submit Request') or normalize-space()='Submit']",
    csmSaveDraftButton: "//button[contains(.,'Save Draft') or normalize-space()='Save as Draft']",

    // Review Actions
    csmApproveButton: "//button[contains(.,'Approve Onboarding') or contains(.,'Final Approval') or normalize-space()='Approve']",
    csmRejectButton: "//button[contains(.,'Reject Onboarding') or normalize-space()='Reject']",
    csmReturnButton: "//button[contains(.,'Return for Corrections') or contains(.,'Return') or normalize-space()='Send Back']",

    // Readiness & Access
    verifyDocumentsButton: "//button[contains(.,'Verify Documents') or contains(.,'Approve Documents') or normalize-space()='Verify']",
    grantAccessButton: "//button[contains(.,'Grant Site Access') or contains(.,'Allow Work') or normalize-space()='Grant Access']",
    csmCommentInput: "#P_CSM_COMMENT, textarea[name*='COMMENT'], textarea[name*='REASON']",
  });
}

registerContractorSupplierPages(defaultRegistry);

module.exports = { registerContractorSupplierPages };
