const { createJiraBug, attachFileToJira } = require("../utils/jira");

class JiraReporter {
  async onTestEnd(test, result) {
    if (result.status === "failed" || result.status === "timedOut") {
      console.log(`\n❌ Test failed: ${test.title}`);

      const errorMessage = result.error?.message || "Unknown error";

      const summary = `Playwright Test Failed: ${test.title}`;

      const description = `
Playwright Test Failure

Test:
${test.title}

File:
${test.location.file}

Error:
${errorMessage}

Status:
${result.status}
`;

      try {
        // 1. Create Jira bug
        const jiraIssue = await createJiraBug(summary, description);

        console.log(`Jira Bug Created: ${jiraIssue.key}`);

        // 2. Find screenshot
        const screenshot = result.attachments.find(
          (attachment) =>
            attachment.contentType === "image/png" ||
            attachment.name.includes("screenshot"),
        );

        // 3. Upload screenshot
        if (screenshot && screenshot.path) {
          console.log(`Uploading screenshot: ${screenshot.path}`);

          await attachFileToJira(jiraIssue.key, screenshot.path);
        } else {
          console.log("No screenshot found for this test.");
        }
      } catch (error) {
        console.error("Jira integration failed:", error.message);
      }
    }
  }

  printsToStdio() {
    return false;
  }
}

module.exports = JiraReporter;
