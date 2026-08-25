process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config();

const https = require("https");

const KIWI_URL = process.env.KIWI_URL;
const USERNAME = process.env.KIWI_USERNAME;
const PASSWORD = process.env.KIWI_PASSWORD;

const agent = new https.Agent({
  rejectUnauthorized: false,
});

async function rpc(method, params, sessionId) {
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

  if (sessionId) {
    headers.Cookie = `sessionid=${sessionId}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
    agent,
  });

  return await response.json();
}

async function main() {
  console.log("Logging into Kiwi...");

  const login = await rpc("Auth.login", [USERNAME, PASSWORD]);

  console.log("Login response:");
  console.dir(login, { depth: null });

  if (login.error) {
    throw new Error(JSON.stringify(login.error));
  }

  const sessionId = login.result;

  console.log("\nChecking Test Case #3...");

  // ...
}

main().catch((error) => {
  console.error("\nERROR:");
  console.error(error);
});
