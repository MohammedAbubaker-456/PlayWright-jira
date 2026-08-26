require("dotenv").config();
const fs = require("fs");
const path = require("path");
const https = require("https");
 
// SSL Bypass for local Kiwi TCMS
if (process.env.KIWI_INSECURE === "1" || process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
 
const KIWI_URL = process.env.KIWI_URL || "https://localhost:443";
const USERNAME = process.env.KIWI_USERNAME;
const PASSWORD = process.env.KIWI_PASSWORD;
const PLAN_ID = parseInt(process.env.KIWI_PLAN_ID || process.env.KIWI_PROJECT || "1", 10);
 
const agent = new https.Agent({ rejectUnauthorized: false });
let cachedSessionId = null;
 
async function rpc(method, params = {}) {
  const url = new URL(`${KIWI_URL}/json-rpc/`);
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method,
    params,
    id: Date.now(),
  });
 
  const headers = {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  };
 
  if (cachedSessionId) {
    headers.Cookie = `sessionid=${cachedSessionId}`;
  }
 
  const response = await fetch(url, { method: "POST", headers, body, agent });
  const json = await response.json();
  if (json.error) {
    throw new Error(`Kiwi RPC Error [${method}]: ${JSON.stringify(json.error)}`);
  }
  return json.result;
}
 
async function login() {
  if (cachedSessionId) return cachedSessionId;
  cachedSessionId = await rpc("Auth.login", [USERNAME, PASSWORD]);
  return cachedSessionId;
}
 
/**
 * Robust CSV parser that handles multi-line fields enclosed in double quotes
 */
function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;
 
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
 
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField.trim());
      if (currentRow.some(f => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }
 
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f.length > 0)) rows.push(currentRow);
  }
 
  return rows;
}
 
async function importCSV(csvFilePath) {
  console.log(`\n=======================================================`);
  console.log(` 📥 Importing Test Cases from CSV to Kiwi TCMS `);
  console.log(`=======================================================\n`);
 
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV File not found: ${csvFilePath}`);
    process.exit(1);
  }
 
  await login();
  const users = await rpc("User.filter", [{ username: USERNAME }]);
  const userId = users && users.length > 0 ? users[0].id : 1;
 
  const categories = await rpc("Category.filter", [{}]);
  const defaultCategory = categories && categories.length > 0 ? categories[0].id : 1;
 
  const priorities = await rpc("Priority.filter", [{}]);
  const defaultPriority = priorities && priorities.length > 0 ? priorities[0].id : 1;
 
  const content = fs.readFileSync(csvFilePath, "utf8");
  const rows = parseCSV(content);
 
  if (rows.length <= 1) {
    console.log("CSV file is empty or only has headers.");
    return;
  }
 
  const headers = rows[0].map(h => h.toLowerCase().trim());
  const tcIdIdx = headers.findIndex(h => h.includes("test case id"));
  const summaryIdx = headers.findIndex(h => h === "summary");
  const descIdx = headers.findIndex(h => h === "description");
  const preIdx = headers.findIndex(h => h === "preconditions");
  const stepsIdx = headers.findIndex(h => h.includes("test steps") || h === "steps");
  const expectedIdx = headers.findIndex(h => h.includes("expected"));
 
  const importedCases = [];
 
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const tcRef = tcIdIdx !== -1 ? cols[tcIdIdx] : "";
    const rawSummary = summaryIdx !== -1 ? cols[summaryIdx] : cols[0];
    if (!rawSummary && !tcRef) continue;
 
    const summary = tcRef ? `${rawSummary} - ${tcRef}` : rawSummary;
    const desc = descIdx !== -1 ? cols[descIdx] : "";
    const pre = preIdx !== -1 ? cols[preIdx] : "";
    const steps = stepsIdx !== -1 ? cols[stepsIdx] : "";
    const expected = expectedIdx !== -1 ? cols[expectedIdx] : "";
 
    const textContent = [
      steps ? `Test Steps:\n${steps}` : "",
      expected ? `\nExpected Result:\n${expected}` : ""
    ].filter(Boolean).join("\n");
 
    const notesContent = [
      desc ? `Description:\n${desc}` : "",
      pre ? `\nPreconditions:\n${pre}` : ""
    ].filter(Boolean).join("\n");
 
    // Check if test case already exists by summary or tag
    const existing = await rpc("TestCase.filter", [{ summary }]);
    let caseId;
 
    if (existing && existing.length > 0) {
      caseId = existing[0].id;
    } else {
      // Create TestCase in Kiwi TCMS
      const created = await rpc("TestCase.create", [{
        product: 1,
        category: defaultCategory,
        priority: defaultPriority,
        case_status: 2, // CONFIRMED
        summary,
        notes: notesContent,
        text: textContent,
        author: userId,
        is_automated: true,
      }]);
      caseId = created.id;
    }
 
    // Link to TestPlan
    await rpc("TestPlan.add_case", [PLAN_ID, caseId]);
 
    importedCases.push({
      "Kiwi Case ID": `Case #${caseId}`,
      "Test Case ID": tcRef || "N/A",
      "Summary": rawSummary,
      "Status": "CONFIRMED",
      "Test Plan": `Plan #${PLAN_ID}`
    });
  }
 
  console.table(importedCases);
  console.log(`\n✅ Successfully imported/synced ${importedCases.length} test cases to Kiwi TCMS (Plan #${PLAN_ID})!`);
  console.log(`\n💡 You can now write Playwright tests using these titles or TC IDs!`);
}
 
const csvFile = process.argv[2] || path.join(__dirname, "incident_testcases.csv");
importCSV(csvFile).catch(console.error);
 