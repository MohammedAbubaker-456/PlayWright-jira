import "dotenv/config";
import { KiwiClient } from "@kiwi-tcms-ai/kiwi-tcms-client";

if (process.env.KIWI_INSECURE === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const client = new KiwiClient({
  url: process.env.KIWI_URL,
  username: process.env.KIWI_USERNAME,
  password: process.env.KIWI_PASSWORD,
});

async function main() {
  const executionId = 2;

  console.log(`Checking TestExecution #${executionId}`);

  const attachments = await client.call("TestExecution.list_attachments", [
    executionId,
  ]);

  console.log("\n=== ATTACHMENTS ===");
  console.dir(attachments, { depth: null });

  if (!attachments?.length) {
    console.log("NO ATTACHMENTS FOUND");
    return;
  }

  for (const attachment of attachments) {
    console.log("\n-----------------------------");
    console.log("Attachment ID :", attachment.pk);
    console.log("Owner         :", attachment.owner_username);
    console.log("Date          :", attachment.date);
    console.log("URL           :", attachment.url);
  }
}

main().catch((err) => {
  console.error("\nERROR:");
  console.error(err);
});
