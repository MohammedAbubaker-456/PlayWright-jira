const { test, expect } = require("@playwright/test");
const { executeWorkflow } = require("../../workflows/engine/workflowEngine");
const { defaultRegistry } = require("../../pages/pageRegistry");

// Register all module page definitions
require("../../pages/incidentPage");
require("../../pages/contractorSupplierPage");
require("../../pages/nearMissPage");

// Load module workflow definitions
const incidentWorkflow = require("../../config/workflows/incident.workflow.json");
const incidentTestData = require("../../data/incidentData.json");

const csmWorkflow = require("../../config/workflows/contractorSupplier.workflow.json");
const csmTestData = require("../../data/contractorSupplierData.json");

const nearMissWorkflow = require("../../config/workflows/nearMiss.workflow.json");
const nearMissTestData = require("../../data/nearMissData.json");

/**
 * Sets up a realistic Oracle APEX Universal Theme DOM in the browser page
 * so that Playwright and ApexFormFiller run real element discoveries, label matching,
 * form fills, and button clicks without unwanted form navigations.
 */
async function setupApexUniversalThemePage(page, moduleTitle, fields = [], actionButtons = []) {
  const fieldsHtml = fields
    .map((f, idx) => {
      const id = f.id || `P_${idx}_FIELD`;
      if (f.type === "textarea") {
        return `
          <div class="t-Form-fieldContainer">
            <label for="${id}">${f.label}</label>
            <textarea id="${id}" class="apex-item-textarea"></textarea>
          </div>
        `;
      }
      if (f.type === "select") {
        const optionsHtml = (f.options || ["Option 1", "Option 2"])
          .map((opt, oIdx) => `<option value="${opt}">${opt}</option>`)
          .join("");
        return `
          <div class="t-Form-fieldContainer">
            <label for="${id}">${f.label}</label>
            <select id="${id}" class="apex-item-select">
              <option value="">- Select -</option>
              ${optionsHtml}
            </select>
          </div>
        `;
      }
      return `
        <div class="t-Form-fieldContainer">
          <label for="${id}">${f.label}</label>
          <input type="text" id="${id}" class="apex-item-text" />
        </div>
      `;
    })
    .join("\n");

  const buttonsHtml = actionButtons
    .map(
      (btn) =>
        `<button type="button" id="${btn.id}" class="t-Button ${btn.class || ''}">${btn.text}</button>`
    )
    .join("\n");

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>SoapBox.cloud - ${moduleTitle}</title></head>
      <body>
        <div id="t_Body_content">
          <h1>${moduleTitle}</h1>
          <ul class="t-Tabs" style="display:flex;gap:10px;list-style:none;padding:0;margin:10px 0;">
            <li class="t-Tabs-item"><a href="#investigation" class="t-Tabs-link">Investigation</a></li>
            <li class="t-Tabs-item"><a href="#evidence" class="t-Tabs-link">Evidence</a></li>
            <li class="t-Tabs-item"><a href="#interviews" class="t-Tabs-link">Interviews</a></li>
            <li class="t-Tabs-item"><a href="#pending" class="t-Tabs-link"><span class="t-Tabs-label">Pending Investigations</span></a></li>
            <li class="t-Tabs-item"><a href="#pendingClosures" class="t-Tabs-link"><span class="t-Tabs-label">Pending Closures</span></a></li>
            <li class="t-Tabs-item"><a href="#closure" class="t-Tabs-link">Closure</a></li>
          </ul>
          <table class="a-IRR-table" border="1" style="margin: 15px 0; width: 100%;">
            <thead><tr><th>ID</th><th>Status Name</th><th>Actions</th></tr></thead>
            <tbody>
              <tr>
                <td>INC-001</td>
                <td>Open</td>
                <td><a href="#view" class="t-Icon--eye"><span class="fa fa-eye">Eye</span></a></td>
              </tr>
            </tbody>
          </table>
          <form id="apexForm" onsubmit="return false;">
            ${fieldsHtml}
            <div class="t-Form-actions" style="margin-top: 20px;">
              ${buttonsHtml}
            </div>
          </form>
        </div>
      </body>
    </html>
  `;

  await page.setContent(fullHtml);
  await page.waitForLoadState("domcontentloaded");
}

test.describe("E2E Three Modules Operational Workflow Execution", () => {
  test("Module 1: Incident Management Module - End-to-End Operational Workflow", async ({ page }, testInfo) => {
    test.setTimeout(90000);

    // Render comprehensive APEX page for Incident across all stages
    await setupApexUniversalThemePage(
      page,
      "Incident Management",
      [
        // 1. Reporting stage
        { label: "Name of the Incident", type: "text" },
        { label: "Incident Description", type: "textarea" },
        { label: "Evidence Description", type: "textarea" },
        { label: "Incident Type", type: "select", options: ["Spill/Leak", "Injury", "Near-Miss"] },
        { label: "Severity", type: "select", options: ["High", "Medium", "Low"] },
        // 2. Assignment stage
        { id: "assignUserSelect", label: "Assign To User", type: "select", options: ["alice@abc.com", "john@abc.com"] },
        // 3. Interview stage
        { label: "Interviewee Name", type: "text" },
        { label: "Statement", type: "textarea" },
        // 4. Approval stages
        { label: "Reviewer Comments", type: "textarea" },
        { label: "Closure Justification", type: "textarea" },
        { label: "Closure Authorization Comments", type: "textarea" },
      ],
      [
        { id: "incidentCreateButton", text: "Create" },
        { id: "assignButton", text: "Assign" },
        { id: "startInvestigationButton", text: "Start Investigation" },
        { id: "goToInvestigationButton", text: "Go To Investigation" },
        { id: "evidenceActionButton", text: "Actions" },
        { id: "verifyCocOption", text: "Verify Coc" },
        { id: "signAndLockRecordButton", text: "Sign & Lock Record" },
        { id: "addInterviewButton", text: "Add Interview" },
        { id: "saveInterviewButton", text: "Save Interview" },
        { id: "submitForReviewButton", text: "Submit For Review" },
        { id: "approveInvestigationButton", text: "Approve Investigation" },
        { id: "initiateClosureButton", text: "Initiate Closure" },
        { id: "submitForApprovalButton", text: "Submit For Approval" },
        { id: "approveClosureButton", text: "Approve Closure" },
      ]
    );

    console.log("\n>>> EXECUTING MODULE 1: INCIDENT MANAGEMENT OPERATIONAL WORKFLOW <<<");
    const result = await executeWorkflow(page, incidentWorkflow, incidentTestData, {
      strategy: "approve",
      pageRegistry: defaultRegistry,
      testInfo,
    });

    expect(result.status).toBe("completed");
    expect(result.attempts).toBeGreaterThanOrEqual(15);

    const states = result.history.map((h) => h.state);
    expect(states).toContain("REPORT_INCIDENT");
    expect(states).toContain("SUBMIT_INCIDENT");
    expect(states).toContain("SELECT_OPEN_INCIDENT");
    expect(states).toContain("ASSIGN_INCIDENT");
    expect(states).toContain("START_INVESTIGATION");
    expect(states).toContain("APPROVE_INVESTIGATION");
    expect(states).toContain("APPROVE_CLOSURE");
    expect(states).toContain("INCIDENT_CLOSED");
  });

  test("Module 2: Contractor & Supplier Management (CSM) - Operational Workflow", async ({ page }, testInfo) => {
    test.setTimeout(60000);

    // Render APEX page for CSM across all stages
    await setupApexUniversalThemePage(
      page,
      "Contractor & Supplier Management",
      [
        // Onboarding Request
        { label: "Contractor Name", type: "text" },
        { label: "Company Registration Number", type: "text" },
        { label: "Contact Person", type: "text" },
        { label: "Email", type: "text" },
        { label: "Primary Work Scope", type: "textarea" },
        { label: "Risk Classification", type: "select", options: ["High", "Medium", "Low"] },
        // Review Comments
        { id: "csmCommentInput", label: "Reviewer Comments", type: "textarea" },
        // Compliance and Worker Readiness
        { label: "Worker ID", type: "text" },
        { label: "Worker Name", type: "text" },
        { label: "Trade Qualification", type: "text" },
        { label: "Medical Fitness Clearance", type: "text" },
      ],
      [
        { id: "submitOnboardingButton", text: "Submit for Review" },
        { id: "csmApproveButton", text: "Approve Onboarding" },
        { id: "csmReturnButton", text: "Return for Corrections" },
        { id: "verifyDocumentsButton", text: "Verify Documents" },
        { id: "grantAccessButton", text: "Grant Site Access" },
      ]
    );

    defaultRegistry.registerLocator("submitOnboardingButton", "#submitOnboardingButton");
    defaultRegistry.registerLocator("csmApproveButton", "#csmApproveButton");
    defaultRegistry.registerLocator("csmReturnButton", "#csmReturnButton");
    defaultRegistry.registerLocator("verifyDocumentsButton", "#verifyDocumentsButton");
    defaultRegistry.registerLocator("grantAccessButton", "#grantAccessButton");
    defaultRegistry.registerLocator("csmCommentInput", "#csmCommentInput");

    console.log("\n>>> EXECUTING MODULE 2: CONTRACTOR & SUPPLIER MANAGEMENT (CSM) WORKFLOW <<<");
    const result = await executeWorkflow(page, csmWorkflow, csmTestData, {
      strategy: "sendBackThenApprove", // Test the Return for Corrections loop!
      pageRegistry: defaultRegistry,
      testInfo,
    });

    expect(result.status).toBe("completed");
    const historyActions = result.history.map((h) => `${h.state} -> ${h.action}`);

    // Verify Send Back Loop was executed
    expect(historyActions.some((a) => a.includes("REVIEW_AND_APPROVAL -> SENDBACK"))).toBe(true);
    expect(historyActions.some((a) => a.includes("EDIT_ONBOARDING"))).toBe(true);
    expect(historyActions.some((a) => a.includes("REVIEW_AND_APPROVAL -> APPROVE"))).toBe(true);
    expect(historyActions.some((a) => a.includes("ACTIVE_APPROVED_CONTRACTOR"))).toBe(true);
  });

  test("Module 3: Near-Miss Reporting & Analysis - Operational Workflow", async ({ page }, testInfo) => {
    test.setTimeout(60000);

    // Render APEX page for Near-Miss across all stages
    await setupApexUniversalThemePage(
      page,
      "Near-Miss Reporting & Analysis",
      [
        // 1. Reporting
        { label: "Observation Title", type: "text" },
        { label: "Description of Unsafe Condition", type: "textarea" },
        { label: "Exact Location", type: "text" },
        { label: "Preliminary Severity Assessment", type: "select", options: ["High", "Moderate", "Minor"] },
        // 2. Review
        { id: "nearMissCommentInput", label: "Review Comment", type: "textarea" },
        // 3. Investigation & RCA
        { label: "Root Cause Analysis", type: "textarea" },
        { label: "Contributing Factors", type: "textarea" },
        // 4. CAPA
        { label: "CAPA Title", type: "text" },
        { label: "Corrective Action", type: "textarea" },
        // 5. Closure
        { label: "Closure Review Notes", type: "textarea" },
      ],
      [
        { id: "submitNearMissButton", text: "Submit Near-Miss" },
        { id: "approveForInvestigationButton", text: "Approve for Investigation" },
        { id: "rejectDuplicateButton", text: "Reject as Duplicate" },
        { id: "approveNearMissClosureButton", text: "Approve Closure" },
        { id: "reopenNearMissButton", text: "Reopen Case" },
      ]
    );

    defaultRegistry.registerLocator("submitNearMissButton", "#submitNearMissButton");
    defaultRegistry.registerLocator("approveForInvestigationButton", "#approveForInvestigationButton");
    defaultRegistry.registerLocator("rejectDuplicateButton", "#rejectDuplicateButton");
    defaultRegistry.registerLocator("approveNearMissClosureButton", "#approveNearMissClosureButton");
    defaultRegistry.registerLocator("reopenNearMissButton", "#reopenNearMissButton");
    defaultRegistry.registerLocator("nearMissCommentInput", "#nearMissCommentInput");

    console.log("\n>>> EXECUTING MODULE 3: NEAR-MISS REPORTING & ANALYSIS WORKFLOW <<<");
    const result = await executeWorkflow(page, nearMissWorkflow, nearMissTestData, {
      strategy: "rejectthenapproveclosure", // Test Closure Reopen & Rework Loop!
      pageRegistry: defaultRegistry,
      testInfo,
    });

    expect(result.status).toBe("completed");
    const historyActions = result.history.map((h) => `${h.state} -> ${h.action}`);

    // Verify Reopen/Rework loop
    expect(historyActions.some((a) => a.includes("NEAR_MISS_CLOSURE_REVIEW -> REJECT"))).toBe(true);
    expect(historyActions.some((a) => a.includes("INVESTIGATION_AND_RCA"))).toBe(true);
    expect(historyActions.some((a) => a.includes("NEAR_MISS_CLOSURE_REVIEW -> APPROVE"))).toBe(true);
    expect(historyActions.some((a) => a.includes("NEAR_MISS_CLOSED_SUCCESS"))).toBe(true);
  });
});
