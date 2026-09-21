require("dotenv").config();
const fs = require("fs");
// const FormData = require("form-data");

const BASE_URL = process.env.JIRA_BASE_URL;
const EMAIL = process.env.JIRA_EMAIL;
const API_TOKEN = process.env.JIRA_API_TOKEN;
const PROJECT_KEY = process.env.JIRA_PROJECT_KEY || "SCBT";

if (!BASE_URL || !EMAIL || !API_TOKEN) {
  throw new Error(
    "Missing Jira environment variables. Required: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN",
  );
}

const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");

async function jiraRequest(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`Jira API ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function attachFile(issueKey, filePath) {
  if (!filePath) {
    throw new Error("No attachment path provided");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Attachment file does not exist: ${filePath}`);
  }

  console.log(`[JIRA] Preparing screenshot upload: ${filePath}`);

  const fileBuffer = fs.readFileSync(filePath);

  // Node.js native Blob
  const blob = new Blob([fileBuffer], {
    type: "image/png",
  });

  // Node.js native FormData
  const form = new FormData();

  form.append("file", blob, "playwright-failure.png");

  console.log(`[JIRA] Sending screenshot to ${issueKey}...`);

  const response = await fetch(
    `${BASE_URL}/rest/api/3/issue/${issueKey}/attachments`,
    {
      method: "POST",

      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",

        // IMPORTANT:
        // Do NOT set Content-Type here.
        // fetch() automatically creates:
        // multipart/form-data; boundary=...
      },

      body: form,
    },
  );

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    console.error("[JIRA] Attachment response:", data);

    throw new Error(
      `Jira attachment error ${response.status}: ${JSON.stringify(data)}`,
    );
  }

  console.log(
    `[JIRA] Screenshot successfully attached to ${issueKey}`,
  );

  return data;
}

/**
 * Get Jira field metadata.
 */
async function getJiraFields() {
  return jiraRequest("/rest/api/3/field");
}

/**
 * Find a Jira field ID by its name.
 *
 * Example:
 * "Execution Status" -> "customfield_100xx"
 */
async function getFieldId(fieldName) {
  const fields = await getJiraFields();

  const field = fields.find(
    (item) => item.name.toLowerCase() === fieldName.toLowerCase(),
  );

  if (!field) {
    throw new Error(`Jira field not found: ${fieldName}`);
  }

  return field.id;
}

/**
 * Find the Jira Test Case using our permanent Test Case ID.
 *
 * Example:
 * TC_UI_INC_GLOBAL_002
 *        ↓
 * SCBT-123
 */
async function findTestCase(testCaseId) {
  const jql =
    `project = "${PROJECT_KEY}" ` + `AND "Test Case ID" = "${testCaseId}"`;

  const body = {
    jql,
    maxResults: 10,
    fields: ["summary", "issuetype"],
  };

  const result = await jiraRequest("/rest/api/3/search/jql", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!result.issues || result.issues.length === 0) {
    throw new Error(`No Jira Test Case found for Test Case ID: ${testCaseId}`);
  }

  if (result.issues.length > 1) {
    throw new Error(
      `Multiple Jira Test Cases found for Test Case ID: ${testCaseId}`,
    );
  }

  const issue = result.issues[0];

  if (issue.fields.issuetype?.name !== "Test Cases") {
    throw new Error(
      `${issue.key} is ${issue.fields.issuetype?.name}, not Test Cases`,
    );
  }

  return issue;
}

/**
 * Update execution information on an existing Jira Test Case.
 */
async function updateTestCaseExecution({
  testCaseId,
  status,
  environment,
  executionDate,
  comment,
  screenshotPath,
}) {
  const issue = await findTestCase(testCaseId);

  const executionStatusField = await getFieldId("Execution Status");
  const lastExecutionDateField = await getFieldId("Last Execution Date");
  //   const lastExecutionEnvironmentField = await getFieldId(
  //     "Last Execution Environment",
  //   );

  const fields = {};

  fields[executionStatusField] = {
    value: status,
  };

  fields[lastExecutionDateField] = executionDate;

  //   fields[lastExecutionEnvironmentField] = environment;

  await jiraRequest(`/rest/api/3/issue/${issue.key}`, {
    method: "PUT",
    body: JSON.stringify({
      fields,
    }),
  });

  if (comment) {
    await addComment(issue.key, comment);
  }

  if (screenshotPath) {
    await attachFile(issue.key, screenshotPath);
  }

  return issue.key;
}

/**
 * Add execution history as a Jira comment.
 */
async function addComment(issueKey, text) {
  await jiraRequest(`/rest/api/3/issue/${issueKey}/comment`, {
    method: "POST",
    body: JSON.stringify({
      body: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text,
              },
            ],
          },
        ],
      },
    }),
  });
}

module.exports = {
  jiraRequest,
  getJiraFields,
  getFieldId,
  findTestCase,
  updateTestCaseExecution,
  addComment,
  attachFile,
};

// require("dotenv").config();

// const fs = require("fs");

// const BASE_URL = process.env.JIRA_BASE_URL;
// const EMAIL = process.env.JIRA_EMAIL;
// const API_TOKEN = process.env.JIRA_API_TOKEN;
// const PROJECT_KEY = process.env.JIRA_PROJECT_KEY || "SCBT";

// const TEST_CASE_ISSUE_TYPE =
//   process.env.JIRA_TEST_CASE_ISSUE_TYPE || "Test Cases";

// if (!BASE_URL || !EMAIL || !API_TOKEN) {
//   throw new Error(
//     "Missing Jira environment variables. Required: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN",
//   );
// }

// const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");

// /*
// ============================================================
// FIELD CACHE
// ============================================================

// Jira fields are loaded only once.

// This prevents calling:

// GET /rest/api/3/field

// for every single test case.
// ============================================================
// */

// let jiraFieldCache = null;

// /*
// ============================================================
// GENERIC JIRA REQUEST
// ============================================================
// */

// async function jiraRequest(path, options = {}) {
//   const response = await fetch(`${BASE_URL}${path}`, {
//     ...options,

//     headers: {
//       Accept: "application/json",
//       "Content-Type": "application/json",
//       Authorization: `Basic ${auth}`,

//       ...(options.headers || {}),
//     },
//   });

//   const text = await response.text();

//   let data = null;

//   try {
//     data = text ? JSON.parse(text) : null;
//   } catch {
//     data = text;
//   }

//   if (!response.ok) {
//     throw new Error(`Jira API ${response.status}: ${JSON.stringify(data)}`);
//   }

//   return data;
// }

// /*
// ============================================================
// GET ALL JIRA FIELDS
// ============================================================
// */

// async function getJiraFields() {
//   if (jiraFieldCache) {
//     return jiraFieldCache;
//   }

//   console.log("[JIRA] Loading Jira fields...");

//   jiraFieldCache = await jiraRequest("/rest/api/3/field");

//   console.log(`[JIRA] Loaded ${jiraFieldCache.length} Jira fields`);

//   return jiraFieldCache;
// }

// /*
// ============================================================
// GET FIELD ID
// ============================================================
// */

// async function getFieldId(fieldName) {
//   const fields = await getJiraFields();

//   const field = fields.find(
//     (item) => item.name && item.name.toLowerCase() === fieldName.toLowerCase(),
//   );

//   if (!field) {
//     throw new Error(`Jira field not found: "${fieldName}"`);
//   }

//   console.log(`[JIRA] Field "${fieldName}" → ${field.id}`);

//   return field.id;
// }

// /*
// ============================================================
// GET FIELD INFORMATION
// ============================================================
// */

// async function getFieldInfo(fieldName) {
//   const fields = await getJiraFields();

//   const field = fields.find(
//     (item) => item.name && item.name.toLowerCase() === fieldName.toLowerCase(),
//   );

//   if (!field) {
//     throw new Error(`Jira field not found: "${fieldName}"`);
//   }

//   return field;
// }

// /*
// ============================================================
// FIND EXISTING TEST CASE
// ============================================================

// Example:

// TC_UI_INC_REPORT_001

//         ↓

// Jira JQL

//         ↓

// SCBT-123

// The existing issue is updated.
// A new Jira issue is NOT created.
// ============================================================
// */

// async function findTestCase(testCaseId) {
//   if (!testCaseId) {
//     throw new Error("Test Case ID is required");
//   }

//   const escapedTestCaseId = testCaseId.replace(/"/g, '\\"');

//   const jql =
//     `project = "${PROJECT_KEY}" ` +
//     `AND "Test Case ID" = "${escapedTestCaseId}"`;

//   console.log(`[JIRA] Searching existing Test Case: ${testCaseId}`);

//   const body = {
//     jql,

//     maxResults: 10,

//     fields: ["summary", "issuetype", "status"],
//   };

//   const result = await jiraRequest("/rest/api/3/search/jql", {
//     method: "POST",
//     body: JSON.stringify(body),
//   });

//   if (!result.issues || result.issues.length === 0) {
//     throw new Error(`No Jira Test Case found for Test Case ID: ${testCaseId}`);
//   }

//   if (result.issues.length > 1) {
//     throw new Error(
//       `Multiple Jira Test Cases found for Test Case ID: ${testCaseId}`,
//     );
//   }

//   const issue = result.issues[0];

//   if (issue.fields?.issuetype?.name !== TEST_CASE_ISSUE_TYPE) {
//     throw new Error(
//       `${issue.key} is "${issue.fields?.issuetype?.name}", ` +
//         `not "${TEST_CASE_ISSUE_TYPE}"`,
//     );
//   }

//   console.log(`[JIRA] Existing Test Case found: ${testCaseId} → ${issue.key}`);

//   console.log(`[JIRA] Summary: ${issue.fields?.summary}`);

//   console.log(`[JIRA] Current Jira Status: ${issue.fields?.status?.name}`);

//   return issue;
// }

// /*
// ============================================================
// GET ISSUE
// ============================================================
// */

// async function getIssue(issueKey, fields = []) {
//   let path = `/rest/api/3/issue/${issueKey}`;

//   if (fields.length > 0) {
//     path += `?fields=${encodeURIComponent(fields.join(","))}`;
//   }

//   return jiraRequest(path);
// }

// /*
// ============================================================
// GET ISSUE EDIT METADATA
// ============================================================

// This tells us:

// - whether the field is editable
// - allowed values
// - field schema
// ============================================================
// */

// async function getIssueEditMeta(issueKey) {
//   return jiraRequest(`/rest/api/3/issue/${issueKey}/editmeta`);
// }

// /*
// ============================================================
// BUILD EXECUTION STATUS VALUE
// ============================================================

// Handles Jira select fields.

// For example:

// Passed
// Failed
// Skipped
// Not Run

// Instead of blindly sending "Passed", we first check
// what Jira actually allows.
// ============================================================
// */

// async function buildExecutionStatusValue(issueKey, fieldId, status) {
//   const editMeta = await getIssueEditMeta(issueKey);

//   const fieldMeta = editMeta.fields?.[fieldId];

//   if (!fieldMeta) {
//     throw new Error(
//       `Execution Status field ${fieldId} is not editable on ${issueKey}.`,
//     );
//   }

//   console.log(`[JIRA] Execution Status field metadata:`);

//   console.log(JSON.stringify(fieldMeta, null, 2));

//   /*
//   ----------------------------------------------------------
//   SELECT / DROPDOWN FIELD
//   ----------------------------------------------------------
//   */

//   if (
//     Array.isArray(fieldMeta.allowedValues) &&
//     fieldMeta.allowedValues.length > 0
//   ) {
//     console.log("[JIRA] Available Execution Status options:");

//     const availableOptions = fieldMeta.allowedValues.map((option) => ({
//       id: option.id,
//       value: option.value,
//     }));

//     console.log(JSON.stringify(availableOptions, null, 2));

//     const matchingOption = fieldMeta.allowedValues.find(
//       (option) =>
//         option.value &&
//         option.value.trim().toLowerCase() === status.trim().toLowerCase(),
//     );

//     if (!matchingOption) {
//       const options = fieldMeta.allowedValues
//         .map((option) => option.value)
//         .filter(Boolean);

//       throw new Error(
//         `Jira Execution Status "${status}" does not exist.\n` +
//           `Available options: ${options.join(", ")}`,
//       );
//     }

//     console.log(
//       `[JIRA] Matched status "${status}" → Jira option "${matchingOption.value}"`,
//     );

//     console.log(`[JIRA] Jira option ID: ${matchingOption.id}`);

//     /*
//      * Use option ID.
//      *
//      * This is more reliable for Jira select fields.
//      */

//     return {
//       id: matchingOption.id,
//     };
//   }

//   /*
//   ----------------------------------------------------------
//   TEXT FIELD
//   ----------------------------------------------------------
//   */

//   if (fieldMeta.schema?.type === "string") {
//     console.log("[JIRA] Execution Status is a text field");

//     return status;
//   }

//   /*
//   ----------------------------------------------------------
//   FALLBACK
//   ----------------------------------------------------------
//   */

//   console.log("[JIRA] Using select-style Execution Status value");

//   return {
//     value: status,
//   };
// }

// /*
// ============================================================
// UPDATE EXISTING TEST CASE
// ============================================================
// */

// async function updateTestCaseExecution({
//   testCaseId,
//   status,
//   environment,
//   executionDate,
//   comment,
//   screenshotPath,
// }) {
//   console.log("");
//   console.log("============================================================");

//   console.log(`[JIRA] Updating Test Case: ${testCaseId}`);

//   console.log("============================================================");

//   /*
//   ----------------------------------------------------------
//   1. FIND EXISTING ISSUE
//   ----------------------------------------------------------
//   */

//   const issue = await findTestCase(testCaseId);

//   console.log(`[JIRA] Jira Issue Key: ${issue.key}`);

//   /*
//   ----------------------------------------------------------
//   2. GET FIELD IDS
//   ----------------------------------------------------------
//   */

//   const executionStatusField = await getFieldId("Execution Status");

//   const lastExecutionDateField = await getFieldId("Last Execution Date");

//   /*
//   ----------------------------------------------------------
//   3. LOG EXECUTION INFORMATION
//   ----------------------------------------------------------
//   */

//   console.log(`[JIRA] Playwright status received: "${status}"`);

//   console.log(`[JIRA] Execution date: "${executionDate}"`);

//   console.log(`[JIRA] Environment: "${environment}"`);

//   /*
//   ----------------------------------------------------------
//   4. BUILD CORRECT STATUS VALUE
//   ----------------------------------------------------------
//   */

//   const executionStatusValue = await buildExecutionStatusValue(
//     issue.key,
//     executionStatusField,
//     status,
//   );

//   /*
//   ----------------------------------------------------------
//   5. BUILD UPDATE PAYLOAD
//   ----------------------------------------------------------
//   */

//   const fields = {};

//   fields[executionStatusField] = executionStatusValue;

//   fields[lastExecutionDateField] = executionDate;

//   console.log("[JIRA] Fields being sent to Jira:");

//   console.log(JSON.stringify(fields, null, 2));

//   /*
//   ----------------------------------------------------------
//   6. UPDATE EXISTING JIRA ISSUE
//   ----------------------------------------------------------
//   */

//   await jiraRequest(`/rest/api/3/issue/${issue.key}`, {
//     method: "PUT",

//     body: JSON.stringify({
//       fields,
//     }),
//   });

//   console.log(`[JIRA] Jira update request succeeded: ${issue.key}`);

//   /*
//   ----------------------------------------------------------
//   7. VERIFY UPDATE
//   ----------------------------------------------------------
//   */

//   const updatedIssue = await getIssue(issue.key, [
//     executionStatusField,
//     lastExecutionDateField,
//   ]);

//   const actualExecutionStatus = updatedIssue.fields?.[executionStatusField];

//   const actualExecutionDate = updatedIssue.fields?.[lastExecutionDateField];

//   console.log("");

//   console.log("[JIRA] ================= VERIFIED =================");

//   console.log(`[JIRA] Execution Status stored in Jira:`);

//   console.log(JSON.stringify(actualExecutionStatus, null, 2));

//   console.log(`[JIRA] Last Execution Date stored in Jira:`);

//   console.log(JSON.stringify(actualExecutionDate, null, 2));

//   console.log("[JIRA] =============================================");

//   /*
//   ----------------------------------------------------------
//   8. ADD EXECUTION HISTORY COMMENT
//   ----------------------------------------------------------
//   */

//   if (comment) {
//     console.log(`[JIRA] Adding execution history comment...`);

//     await addComment(issue.key, comment);

//     console.log(`[JIRA] Execution history added to ${issue.key}`);
//   }

//   /*
//   ----------------------------------------------------------
//   9. ATTACH FAILURE SCREENSHOT
//   ----------------------------------------------------------
//   */

//   if (screenshotPath) {
//     console.log(`[JIRA] Screenshot found: ${screenshotPath}`);

//     await attachFile(issue.key, screenshotPath);
//   }

//   console.log("");

//   console.log("============================================================");

//   console.log(`[JIRA] SUCCESS`);

//   console.log(`[JIRA] ${testCaseId} → ${issue.key} → ${status}`);

//   console.log("============================================================");

//   console.log("");

//   return issue.key;
// }

// /*
// ============================================================
// ADD EXECUTION HISTORY COMMENT
// ============================================================

// Every execution gets a new Jira comment.

// Example:

// Execution 1 → Failed
// Execution 2 → Passed
// Execution 3 → Failed
// Execution 4 → Passed

// Nothing is deleted.
// ============================================================
// */

// async function addComment(issueKey, text) {
//   if (!text) {
//     return;
//   }

//   await jiraRequest(`/rest/api/3/issue/${issueKey}/comment`, {
//     method: "POST",

//     body: JSON.stringify({
//       body: {
//         type: "doc",

//         version: 1,

//         content: [
//           {
//             type: "paragraph",

//             content: [
//               {
//                 type: "text",
//                 text,
//               },
//             ],
//           },
//         ],
//       },
//     }),
//   });
// }

// /*
// ============================================================
// ATTACH FILE
// ============================================================
// */

// async function attachFile(issueKey, filePath) {
//   if (!filePath) {
//     throw new Error("No attachment path provided");
//   }

//   if (!fs.existsSync(filePath)) {
//     throw new Error(`Attachment file does not exist: ${filePath}`);
//   }

//   console.log(`[JIRA] Preparing screenshot upload: ${filePath}`);

//   const fileBuffer = fs.readFileSync(filePath);

//   const blob = new Blob([fileBuffer], {
//     type: "image/png",
//   });

//   const form = new FormData();

//   form.append("file", blob, "playwright-failure.png");

//   console.log(`[JIRA] Uploading screenshot to ${issueKey}...`);

//   const response = await fetch(
//     `${BASE_URL}/rest/api/3/issue/${issueKey}/attachments`,
//     {
//       method: "POST",

//       headers: {
//         Authorization: `Basic ${auth}`,

//         Accept: "application/json",

//         "X-Atlassian-Token": "no-check",
//       },

//       body: form,
//     },
//   );

//   const text = await response.text();

//   let data;

//   try {
//     data = text ? JSON.parse(text) : null;
//   } catch {
//     data = text;
//   }

//   if (!response.ok) {
//     console.error("[JIRA] Attachment response:", data);

//     throw new Error(
//       `Jira attachment error ${response.status}: ${JSON.stringify(data)}`,
//     );
//   }

//   console.log(`[JIRA] Screenshot successfully attached to ${issueKey}`);

//   return data;
// }

// /*
// ============================================================
// GET ISSUE CHANGELOG
// ============================================================

// Can be used later to retrieve Jira's native history.
// ============================================================
// */

// async function getIssueChangelog(issueKey) {
//   return jiraRequest(`/rest/api/3/issue/${issueKey}/changelog`);
// }

// /*
// ============================================================
// GET JIRA WORKFLOW TRANSITIONS
// ============================================================

// This is separate from Execution Status.

// Example Jira Status:

// To Do
// In Progress
// Done
// ============================================================
// */

// async function getTransitions(issueKey) {
//   return jiraRequest(`/rest/api/3/issue/${issueKey}/transitions`);
// }

// /*
// ============================================================
// TRANSITION JIRA ISSUE
// ============================================================

// This changes Jira's MAIN Status.

// Do not use this for:

// Passed
// Failed
// Skipped

// Use Execution Status for those.
// ============================================================
// */

// async function transitionIssue(issueKey, transitionId) {
//   if (!transitionId) {
//     throw new Error("Transition ID is required");
//   }

//   return jiraRequest(`/rest/api/3/issue/${issueKey}/transitions`, {
//     method: "POST",

//     body: JSON.stringify({
//       transition: {
//         id: transitionId,
//       },
//     }),
//   });
// }

// /*
// ============================================================
// EXPORTS
// ============================================================
// */

// module.exports = {
//   jiraRequest,

//   getJiraFields,

//   getFieldId,

//   getFieldInfo,

//   findTestCase,

//   getIssue,

//   getIssueEditMeta,

//   getIssueChangelog,

//   getTransitions,

//   transitionIssue,

//   updateTestCaseExecution,

//   addComment,

//   attachFile,
// };
