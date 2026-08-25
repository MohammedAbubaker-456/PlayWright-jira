require("dotenv").config();

// Kiwi is running locally with a self-signed certificate
if (process.env.KIWI_INSECURE === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const { KiwiClient } = require("@kiwi-tcms-ai/kiwi-tcms-client");

async function main() {
  const client = new KiwiClient({
    url: process.env.KIWI_URL,
    username: process.env.KIWI_USERNAME,
    password: process.env.KIWI_PASSWORD,
    project: process.env.KIWI_PROJECT,
    timeoutMs: 30000,
  });

  console.log("Connected to Kiwi");
  console.log("Creating Version...");

  const result = await client.versions.create({
    value: "unspecified",
  });

  console.log("Version created:");
  console.dir(result, { depth: null });
}

main().catch((error) => {
  console.error("ERROR:");
  console.error(error);
});