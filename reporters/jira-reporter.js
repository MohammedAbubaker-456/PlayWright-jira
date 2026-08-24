const { updateTestCaseExecution } = require("../utils/jira");

function extractTestCaseId(test) {
  const fullTitle = test.titlePath().join(" ");

  const match = fullTitle.match(/TC_[A-Z0-9_]+/);

  return match ? match[0] : null;
}

class JiraReporter {
  async onTestEnd(test, result) {
    const testCaseId = extractTestCaseId(test);

    if (!testCaseId) {
      console.log(`[JIRA] No Test Case ID found for: ${test.title}`);

      return;
    }

    console.log(`\n[JIRA] Processing ${testCaseId}`);

    let jiraStatus;

    if (result.status === "passed") {
      jiraStatus = process.env.JIRA_EXECUTION_STATUS_PASSED || "Passed";
    } else if (result.status === "failed" || result.status === "timedOut") {
      jiraStatus = process.env.JIRA_EXECUTION_STATUS_FAILED || "Failed";
    } else {
      jiraStatus = process.env.JIRA_EXECUTION_STATUS_SKIPPED || "Skipped";
    }

    const executionDate = new Date().toISOString().split("T")[0];

    // const environment = `${test.parent.project()?.name || "Unknown"} / ${
    //   result.retry
    // }`;

    const environment = "Desktop / Chrome";

    let comment = [
      `Playwright Execution`,
      ``,
      `Test Case ID: ${testCaseId}`,
      `Test: ${test.title}`,
      `Result: ${jiraStatus}`,
      `Date: ${new Date().toISOString()}`,
      `Duration: ${result.duration} ms`,
      `Retry: ${result.retry}`,
    ].join("\n");

    if (result.error) {
      comment += [``, `Error:`, result.error.message].join("\n");
    }

    /*
     * Playwright automatically creates the screenshot because
     * playwright.config.js contains:
     *
     * screenshot: "only-on-failure"
     */

    const screenshot = result.attachments.find(
      (attachment) =>
        attachment.path &&
        (attachment.contentType === "image/png" ||
          attachment.name === "screenshot"),
    );

    if (screenshot) {
      console.log(`[JIRA] Failure screenshot found: ${screenshot.path}`);
    }

    try {
      const issueKey = await updateTestCaseExecution({
        testCaseId,
        status: jiraStatus,
        environment,
        executionDate,
        comment,
        screenshotPath: screenshot?.path || null,
      });

      console.log(`[JIRA] ${testCaseId} → ${issueKey} → ${jiraStatus}`);

      if (screenshot) {
        console.log(`[JIRA] Screenshot attached to ${issueKey}`);
      }
    } catch (error) {
      console.error(`[JIRA] Failed to update ${testCaseId}:`, error.message);
    }
  }

  printsToStdio() {
    return false;
  }
}

module.exports = JiraReporter;
