/**
 * Incident Management Module Page Definitions & Locators
 * -------------------------------------------------------
 * Maps semantic keys for the Incident Management operational workflow:
 * Report -> Submit -> Select Open (Dashboard) -> Assign -> Start Investigation ->
 * Go to Investigation -> Verify CoC -> Add Interview -> Submit Review ->
 * Approve Investigation -> Initiate Closure -> Approve Closure -> Complete
 */

const { defaultRegistry } = require("./pageRegistry");

function registerIncidentPages(registry = defaultRegistry) {
  // Pages
  registry.registerPage("incidentDashboard", {
    iconLocator: "//span[@class='fa fa fa-pie-chart']",
    headerLocator: "(//h1[normalize-space()='Dashboard'])[1]",
    expectedTitle: "Dashboard",
  });

  registry.registerPage("incidentReporting", {
    triggerLocator: "(//button[@id='B4742357481340896475'])[1] | //button[contains(.,'Report New Incident')]",
    headerLocator: "//h1[contains(.,'Report New Incident') or contains(.,'Incident')]",
    expectedTitle: "Incident",
  });

  registry.registerPage("pendingApprovals", {
    iconLocator: "//span[@class='fa fa fa-check-circle-o']",
    headerLocator: "//h1[normalize-space()='Pending Approvals']",
    expectedTitle: "Pending Approvals",
  });

  // Alias for backward compatibility
  registry.registerPage("incidentClosureReview", {
    iconLocator: "//span[@class='fa fa fa-check-circle-o']",
    headerLocator: "//h1[normalize-space()='Pending Approvals']",
    expectedTitle: "Pending Approvals",
  });

  registry.registerPage("incidentAssignment", {
    iconLocator: "//span[@class='fa fa fa-users']",
    headerLocator: "//h1[normalize-space()='Incident Assignment']",
    expectedTitle: "Incident Assignment",
  });

  // Locators
  registry.registerLocators({
    // 1. Reporting & Submission
    reportNewIncidentButton: "(//button[@id='B4742357481340896475'])[1] | //button[contains(.,'Report New Incident')]",
    incidentCreateButton: "//span[normalize-space()='Create'] | //button[contains(.,'Create')]",
    okButton:
      "//button[normalize-space()='OK'] | " +
      "//button[contains(@class,'js-confirm-ok')] | " +
      "//div[@role='dialog']//button[normalize-space()='OK'] | " +
      "//div[contains(@class,'ui-dialog')]//button[normalize-space()='OK'] | " +
      "//button[contains(.,'OK')]",
    incidentSaveDraftButton: "//span[normalize-space()='Save as Draft'] | //button[contains(.,'Draft')]",
    apexErrorAlert:
      "//div[contains(@class,'t-Alert') and (contains(.,'error') or contains(.,'ORA-'))] | " +
      "//div[contains(@class,'a-Notification') and (contains(.,'error') or contains(.,'ORA-'))] | " +
      "//*[@id='t_Alert_Notification'] | " +
      "//*[contains(text(),'error has occurred') or contains(text(),'error occurred')]",

    // 2. Dashboard Open Incident Selection
    dashboardOpenIncidentEye:
      "//tr[.//td[contains(normalize-space(),'Open')]]//span[contains(@class,'fa-eye')]/parent::a | " +
      "//tr[.//td[contains(normalize-space(),'Open')]]//a[.//span[contains(@class,'fa-eye')]] | " +
      "//tr[.//td[contains(normalize-space(),'Open')]]//span[contains(@class,'fa-eye')] | " +
      "//tbody/tr[1]//span[contains(@class,'fa-eye')]/parent::a",
    dashboardIncidentEye:
      "//tbody/tr[1]//span[contains(@class,'fa-eye')]/parent::a | " +
      "//tbody/tr[1]//a[.//span[contains(@class,'fa-eye')]] | " +
      "//tbody/tr[1]//td[contains(@class,'action') or position()=last()]//a",

    // 3. Assignment
    assignButton:
      "//div[@id='t_Body_content']//*[self::button or self::a or @role='button'][not(@role='treeitem')][(normalize-space(.)='Reassign' or normalize-space(.)='Assign' or contains(.,'Reassign')) and not(contains(.,'Assignment'))] | " +
      "//div[contains(.,'Quick Actions')]//*[self::button or self::a or @role='button'][not(@role='treeitem')][contains(.,'Assign') and not(contains(.,'Assignment'))]",
    assignModalIframe: "iframe:visible, div[role='dialog']:visible iframe, iframe",
    assignUserSelect: "#P4040_USER, select[name*='USER'], select[name*='ASSIGN'], select",
    assignConfirmButton:
      "//button[normalize-space()='Assign' or contains(.,'Assign')] | " +
      "//*[contains(@class,'t-Button-label') and contains(.,'Assign')]",

    // 4. Investigation Tabs & Buttons
    investigationTab:
      "//ul[contains(@class,'t-Tabs')]//li[contains(@class,'t-Tabs-item')]//a[contains(.,'Investigation')] | " +
      "//ul[contains(@class,'t-Tabs')]//a[contains(.,'Investigation')] | " +
      "//a[@role='tab' and contains(.,'Investigation')] | " +
      "//li[contains(@class,'t-Tabs-item')]//*[contains(text(),'Investigation')] | " +
      "//a[normalize-space()='Investigation' or contains(.,'Investigation')]",
    investigationScopeInput:
      "//textarea[contains(@id,'SCOPE') or contains(@name,'SCOPE')] | " +
      "//div[.//label[contains(.,'Investigation Scope')]]//textarea | " +
      "//label[contains(.,'Investigation Scope')]/following::textarea[1] | " +
      "//textarea",
    startInvestigationButton:
      "//button[contains(normalize-space(),'Start Investigation') or contains(.,'Start Investigation')] | " +
      "//a[contains(normalize-space(),'Start Investigation') or contains(.,'Start Investigation')] | " +
      "//*[@role='button' and (contains(normalize-space(),'Start Investigation') or contains(.,'Start Investigation'))] | " +
      "//*[contains(@class,'t-Button') and contains(.,'Start Investigation')]",
    goToInvestigationButton:
      "//*[@id='B3484085389661880442'] | " +
      "//button[contains(normalize-space(.), 'Go To Investigation') or contains(.,'Go To Investigation')] | " +
      "//a[contains(normalize-space(.), 'Go To Investigation') or contains(.,'Go To Investigation')] | " +
      "//*[@role='button' and contains(.,'Go To Investigation')] | " +
      "//*[contains(@class,'t-Button') and contains(.,'Go To Investigation')]",

    // 5. Evidence & CoC
    evidenceTab:
      "//ul[contains(@class,'t-Tabs')]//li[contains(@class,'t-Tabs-item')]//a[contains(.,'Evidence')] | " +
      "//ul[contains(@class,'t-Tabs')]//a[contains(.,'Evidence')] | " +
      "//a[@role='tab' and contains(.,'Evidence')] | " +
      "//li[contains(@class,'t-Tabs-item')]//*[contains(text(),'Evidence')] | " +
      "//a[normalize-space()='Evidence' or contains(.,'Evidence')]",
    evidenceActionButton:
      "//tbody/tr[1]//button[contains(.,'⁝') or contains(@class,'ellipsis') or @title='Actions' or @aria-label='Actions'] | " +
      "//tbody/tr[1]//td[8]//button | " +
      "//tbody/tr[1]//td[contains(@headers,'ACTION') or position()=8 or position()=last()-1]//button | " +
      "//tbody/tr[1]//button",
    verifyCocOption:
      "//button[contains(@class,'sb-dropdown-item') and (contains(.,'Verify Coc') or contains(.,'Verify CoC') or contains(.,'Verify COC'))] | " +
      "//span[contains(text(),'Verify Coc') or contains(text(),'Verify CoC') or contains(text(),'Verify COC')] | " +
      "//button[contains(.,'Verify Coc') or contains(.,'Verify CoC')] | " +
      "//a[contains(.,'Verify Coc') or contains(.,'Verify CoC')] | " +
      "//*[contains(text(),'Verify Coc') or contains(text(),'Verify CoC')]",
    signAndLockRecordButton:
      "//button[contains(normalize-space(),'Sign & Lock Record') or contains(normalize-space(),'Sign and Lock Record') or contains(.,'Sign & Lock Record') or contains(.,'Sign & Lock')] | " +
      "//*[contains(@class,'t-Button') and contains(.,'Sign & Lock')]",

    // 6. Interviews
    interviewsTab:
      "//ul[contains(@class,'t-Tabs')]//li[contains(@class,'t-Tabs-item')]//a[contains(.,'Interviews')] | " +
      "//ul[contains(@class,'t-Tabs')]//a[contains(.,'Interviews')] | " +
      "//a[@role='tab' and contains(.,'Interviews')] | " +
      "//li[contains(@class,'t-Tabs-item')]//*[contains(text(),'Interviews')] | " +
      "//a[normalize-space()='Interviews' or contains(.,'Interviews')]",
    addInterviewButton: "//button[contains(normalize-space(),'Add Interview') or contains(.,'Add Interview')]",
    saveInterviewButton: "//button[contains(normalize-space(),'Save Interview') or contains(.,'Save Interview')]",
    submitForReviewButton:
      "//button[contains(normalize-space(),'Submit For Review') or contains(normalize-space(),'Submit for Review') or contains(.,'Submit For Review')]",

    // 7. Pending Approvals - Investigation
    pendingInvestigationsTab:
      "//ul[contains(@class,'t-Tabs')]//li[contains(@class,'t-Tabs-item')]//a[contains(.,'Pending Investigations')] | " +
      "//ul[contains(@class,'t-Tabs')]//a[contains(.,'Pending Investigations')] | " +
      "//span[normalize-space()='Pending Investigations' or contains(.,'Pending Investigations')] | " +
      "//a[contains(.,'Pending Investigations')] | " +
      "//button[@role='tab' and contains(.,'Pending Investigations')] | " +
      "//li[contains(@class,'t-Tabs-item')]//*[contains(text(),'Pending Investigations')]",
    pendingInvestigationEye:
      ".//td[last()]//*[self::a or self::span or self::button or self::svg] | " +
      ".//td[last()] | " +
      ".//span[contains(@class,'fa-eye')]/parent::a | " +
      ".//a[.//span[contains(@class,'fa-eye')]] | " +
      ".//td[last()]//a | " +
      "//tbody/tr[1]//td[last()]//*[self::a or self::span or self::button or self::svg] | " +
      "//tbody/tr[1]//td[last()]",
    approveInvestigationButton:
      "//button[contains(normalize-space(),'Approve Investigation') or contains(.,'Approve Investigation')]",

    // 8. Closure Initiation
    closureTab:
      "//ul[contains(@class,'t-Tabs')]//li[contains(@class,'t-Tabs-item')]//a[contains(.,'Closure')] | " +
      "//ul[contains(@class,'t-Tabs')]//a[contains(.,'Closure')] | " +
      "//a[@role='tab' and contains(.,'Closure')] | " +
      "//li[contains(@class,'t-Tabs-item')]//*[contains(text(),'Closure')] | " +
      "//a[normalize-space()='Closure' or contains(.,'Closure')]",
    initiateClosureButton:
      "//button[contains(normalize-space(),'Initiate Closure') or contains(normalize-space(),'Initate Closure') or contains(.,'Initiate Closure')]",
    submitForApprovalButton:
      "//button[contains(normalize-space(),'Submit For Approval') or contains(normalize-space(),'Submit for Approval') or contains(.,'Submit For Approval')]",

    // 9. Pending Approvals - Closure
    pendingClosuresTab:
      "//ul[contains(@class,'t-Tabs')]//li[contains(@class,'t-Tabs-item')]//a[contains(.,'Pending Closures')] | " +
      "//ul[contains(@class,'t-Tabs')]//a[contains(.,'Pending Closures')] | " +
      "//span[normalize-space()='Pending Closures' or contains(.,'Pending Closures')] | " +
      "//a[contains(.,'Pending Closures')] | " +
      "//button[@role='tab' and contains(.,'Pending Closures')]",
    pendingClosureEye:
      ".//td[last()]//*[self::a or self::span or self::button or self::svg] | " +
      ".//td[last()] | " +
      ".//span[contains(@class,'fa-eye')]/parent::a | " +
      ".//a[.//span[contains(@class,'fa-eye')]] | " +
      ".//td[last()]//a | " +
      "//tbody/tr[1]//td[last()]//*[self::a or self::span or self::button or self::svg] | " +
      "//tbody/tr[1]//td[last()]",
    approveClosureButton:
      "//button[contains(normalize-space(),'Approve Closure') or contains(.,'Approve Closure')]",
    rejectClosureButton:
      "//button[contains(normalize-space(),'Reject Closure') or contains(.,'Reject Closure')]",
    closureModalIframe: "iframe[title='Authorize Closure'], iframe",
    closureCommentInput: "#P5080_ADMIN_COMMENT, textarea[name*='COMMENT']",
  });
}

registerIncidentPages(defaultRegistry);

module.exports = { registerIncidentPages };
