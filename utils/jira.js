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
