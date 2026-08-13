require("dotenv").config();
const fs = require("fs");
// const FormData = require("form-data");

const auth = Buffer.from(
    `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
).toString("base64");

async function createJiraBug(summary, description) {

    const response = await fetch(
        `${process.env.JIRA_BASE_URL}/rest/api/3/issue`,
        {
            method: "POST",

            headers: {
                "Authorization": `Basic ${auth}`,
                "Accept": "application/json",
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                fields: {
                    project: {
                        key: process.env.JIRA_PROJECT_KEY
                    },

                    summary: summary,

                    description: {
                        type: "doc",
                        version: 1,
                        content: [
                            {
                                type: "paragraph",
                                content: [
                                    {
                                        type: "text",
                                        text: description
                                    }
                                ]
                            }
                        ]
                    },

                    issuetype: {
                        name: "Bug"
                    }
                }
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error("Jira error:", data);
        throw new Error(`Jira API failed with status ${response.status}`);
    }

    console.log("Jira bug created:", data.key);

    return data;
}

async function attachFileToJira(issueKey, filePath) {

    if (!fs.existsSync(filePath)) {
        console.error("File does not exist:", filePath);
        return;
    }

    const auth = Buffer.from(
        `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
    ).toString("base64");

    // Read screenshot
    const fileBuffer = fs.readFileSync(filePath);

    // Convert file to Blob
    const fileBlob = new Blob(
        [fileBuffer],
        {
            type: "image/png"
        }
    );

    // Use Node's built-in FormData
    const form = new FormData();

    form.append(
        "file",
        fileBlob,
        "screenshot.png"
    );

    const response = await fetch(
        `${process.env.JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/attachments`,
        {
            method: "POST",

            headers: {
                "Authorization": `Basic ${auth}`,
                "Accept": "application/json",
                "X-Atlassian-Token": "no-check"
            },

            body: form
        }
    );

    const data = await response.json();

    if (!response.ok) {

        console.error(
            "Jira attachment error:",
            data
        );

        throw new Error(
            `Jira attachment failed with status ${response.status}`
        );
    }

    console.log(
        `Screenshot successfully attached to ${issueKey}`
    );

    return data;
}

module.exports = {
    createJiraBug,
    attachFileToJira
};