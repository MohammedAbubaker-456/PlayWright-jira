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
  console.log("\nGetting Test Execution statuses...\n");

  const statuses = await client.call("TestExecutionStatus.filter", [{}]);

  console.dir(statuses, { depth: null });
}

main().catch((error) => {
  console.error("\nERROR:");
  console.error(error);
});