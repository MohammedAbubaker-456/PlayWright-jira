require("dotenv").config();

if (process.env.KIWI_INSECURE === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const { KiwiClient } = require("@kiwi-tcms-ai/kiwi-tcms-client");

async function main() {
  const client = new KiwiClient({
    url: process.env.KIWI_URL,
    username: process.env.KIWI_USERNAME,
    password: process.env.KIWI_PASSWORD,
    timeoutMs: 30000,
  });

  console.log("Connected to Kiwi");

  const RUN_ID = 2;
  const CASE_ID = 3;

  console.log(`\nChecking TestExecution for Run #${RUN_ID}, Case #${CASE_ID}...`);

  const executions = await client.call("TestExecution.filter", [
    {
      run: RUN_ID,
      case: CASE_ID,
    },
  ]);

  console.log("\nExisting executions:");
  console.dir(executions, { depth: null });

  if (executions && executions.length > 0) {
    console.log("\nExecution already exists.");
    return;
  }

  console.log("\nNo execution found.");
  console.log("Adding Test Case to Test Run...");

  const addResult = await client.call("TestRun.add_case", [
    RUN_ID,
    CASE_ID,
  ]);

  console.log("\nTestRun.add_case result:");
  console.dir(addResult, { depth: null });

  console.log("\nChecking execution again...");

  const executionsAfter = await client.call("TestExecution.filter", [
    {
      run: RUN_ID,
      case: CASE_ID,
    },
  ]);

  console.log("\nExecutions after adding case:");
  console.dir(executionsAfter, { depth: null });
}

main().catch((error) => {
  console.error("\nERROR:");
  console.error(error);
});