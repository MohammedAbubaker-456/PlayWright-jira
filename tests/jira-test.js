require("dotenv").config();

const auth = Buffer.from(
    `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
).toString("base64");

async function testJiraConnection() {

    const response = await fetch(
        `${process.env.JIRA_BASE_URL}/rest/api/3/myself`,
        {
            method: "GET",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Accept": "application/json"
            }
        }
    );

    const data = await response.json();

    console.log("Status:", response.status);
    console.log(data);
}

testJiraConnection();