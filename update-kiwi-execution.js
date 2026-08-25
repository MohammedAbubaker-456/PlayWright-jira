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

  const EXECUTION_ID = 2;

  // Simulate a Playwright test that took 5 seconds
  const stop = new Date();
  const start = new Date(stop.getTime() - 5000);

  function kiwiDate(date) {
    return date.toISOString().replace("Z", "");
  }

  console.log("Execution:", EXECUTION_ID);
  console.log("Status: PASSED (4)");
  console.log("Start:", start.toISOString());
  console.log("Stop:", stop.toISOString());

  console.log("\nSending exact reporter-style update...");

  const result = await client.call("TestExecution.update", [
    EXECUTION_ID,
    {
      status: 4,
      start_date: kiwiDate(start),
      stop_date: kiwiDate(stop),
    },
  ]);

  console.log("\nUpdate result:");
  console.dir(result, { depth: null });
}

main().catch((error) => {
  console.error("\nERROR:");
  console.error(error);
});
