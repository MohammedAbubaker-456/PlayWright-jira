// const { updateTestCaseExecution } = require("../utils/jira");

// function extractTestCaseId(test) {
//   const fullTitle = test.titlePath().join(" ");

//   const match = fullTitle.match(/TC_[A-Z0-9_]+/);

//   return match ? match[0] : null;
// }

// class JiraReporter {
//   constructor() {
//     this.results = [];
//   }

//   // -----------------------------------------
//   // Collect test results
//   // -----------------------------------------

//   onTestEnd(test, result) {
//     const testCaseId = extractTestCaseId(test);

//     console.log(`[JIRA DEBUG] Test finished: ${test.title} | ${result.status}`);

//     if (!testCaseId) {
//       console.log(`[JIRA] No Test Case ID found for: ${test.title}`);

//       return;
//     }

//     let jiraStatus;

//     if (result.status === "passed") {
//       jiraStatus = process.env.JIRA_EXECUTION_STATUS_PASSED || "Passed";
//     } else if (result.status === "failed" || result.status === "timedOut") {
//       jiraStatus = process.env.JIRA_EXECUTION_STATUS_FAILED || "Failed";
//     } else {
//       jiraStatus = process.env.JIRA_EXECUTION_STATUS_SKIPPED || "Skipped";
//     }

//     const executionDate = new Date().toISOString().split("T")[0];

//     const environment = "Desktop / Chrome";

//     let comment = [
//       "Playwright Execution",
//       "",
//       `Test Case ID: ${testCaseId}`,
//       `Test: ${test.title}`,
//       `Result: ${jiraStatus}`,
//       `Date: ${new Date().toISOString()}`,
//       `Duration: ${result.duration} ms`,
//       `Retry: ${result.retry}`,
//     ].join("\n");

//     if (result.error) {
//       comment += ["", "Error:", result.error.message].join("\n");
//     }

//     const screenshot = result.attachments.find(
//       (attachment) =>
//         attachment.path &&
//         (attachment.contentType === "image/png" ||
//           attachment.name === "screenshot"),
//     );

//     this.results.push({
//       testCaseId,
//       jiraStatus,
//       environment,
//       executionDate,
//       comment,
//       screenshotPath: screenshot ? screenshot.path : null,
//     });

//     console.log(`[JIRA] Queued ${testCaseId} → ${jiraStatus}`);
//   }

//   // -----------------------------------------
//   // Perform Jira updates AFTER test run
//   // -----------------------------------------

//   async onEnd() {
//     console.log(
//       `\n[JIRA] Starting Jira updates for ${this.results.length} test(s)`,
//     );

//     for (const execution of this.results) {
//       try {
//         console.log(
//           `[JIRA] Updating ${execution.testCaseId} → ${execution.jiraStatus}`,
//         );

//         const issueKey = await updateTestCaseExecution({
//           testCaseId: execution.testCaseId,

//           status: execution.jiraStatus,

//           environment: execution.environment,

//           executionDate: execution.executionDate,

//           comment: execution.comment,

//           screenshotPath: execution.screenshotPath,
//         });

//         console.log(
//           `[JIRA] ${execution.testCaseId} → ${issueKey} → ${execution.jiraStatus}`,
//         );

//         if (execution.screenshotPath) {
//           console.log(`[JIRA] Screenshot attached to ${issueKey}`);
//         }
//       } catch (error) {
//         console.error(
//           `[JIRA] Failed to update ${execution.testCaseId}:`,
//           error.message,
//         );
//       }
//     }

//     console.log("[JIRA] Jira processing completed");
//   }

//   printsToStdio() {
//     return false;
//   }
// }

// module.exports = JiraReporter;

const { updateTestCaseExecution } = require("../utils/jira");

function extractTestCaseId(test) {
  const fullTitle = test.titlePath().join(" ");

  console.log(`[JIRA DEBUG] Full test title: ${fullTitle}`);

  // --------------------------------------------------
  // Format 1:
  // TC_UI_INC_GLOBAL_002
  // TC_UI_INC_REPORT_001
  // etc.
  // --------------------------------------------------

  const tcMatch = fullTitle.match(/\bTC_[A-Z0-9_]+\b/);

  if (tcMatch) {
    console.log(`[JIRA DEBUG] Found Test Case ID: ${tcMatch[0]}`);
    return tcMatch[0];
  }

  // --------------------------------------------------
  // Format 2:
  // IM-VAL-012
  // IM-VAL-013
  // IM-REPORT-001
  // etc.
  // --------------------------------------------------

  const imMatch = fullTitle.match(/\bIM-[A-Z]+-\d+\b/);

  if (imMatch) {
    console.log(`[JIRA DEBUG] Found Test Case ID: ${imMatch[0]}`);
    return imMatch[0];
  }

  // --------------------------------------------------
  // No supported Test Case ID found
  // --------------------------------------------------

  console.log(`[JIRA DEBUG] No Test Case ID found in: ${fullTitle}`);

  return null;
}

class JiraReporter {
  constructor() {
    this.results = [];
  }

  // -----------------------------------------
  // Collect test results
  // -----------------------------------------

  onTestEnd(test, result) {
    const testCaseId = extractTestCaseId(test);

    console.log(
      `[JIRA DEBUG] Test finished: ${test.title} | ${result.status}`,
    );

    // -----------------------------------------
    // If no Test Case ID was found
    // -----------------------------------------

    if (!testCaseId) {
      console.log(
        `[JIRA] No Test Case ID found for: ${test.title}`,
      );

      return;
    }

    // -----------------------------------------
    // Convert Playwright status → Jira status
    // -----------------------------------------

    let jiraStatus;

    if (result.status === "passed") {
      jiraStatus =
        process.env.JIRA_EXECUTION_STATUS_PASSED || "Passed";
    } else if (
      result.status === "failed" ||
      result.status === "timedOut"
    ) {
      jiraStatus =
        process.env.JIRA_EXECUTION_STATUS_FAILED || "Failed";
    } else {
      jiraStatus =
        process.env.JIRA_EXECUTION_STATUS_SKIPPED || "Skipped";
    }

    // -----------------------------------------
    // Execution metadata
    // -----------------------------------------

    const executionDate = new Date()
      .toISOString()
      .split("T")[0];

    const environment = "Desktop / Chrome";

    // -----------------------------------------
    // Jira comment
    // -----------------------------------------

    let comment = [
      "Playwright Execution",
      "",
      `Test Case ID: ${testCaseId}`,
      `Test: ${test.title}`,
      `Result: ${jiraStatus}`,
      `Date: ${new Date().toISOString()}`,
      `Duration: ${result.duration} ms`,
      `Retry: ${result.retry}`,
    ].join("\n");

    // -----------------------------------------
    // Add error information
    // -----------------------------------------

    if (result.error) {
      comment += [
        "",
        "Error:",
        result.error.message,
      ].join("\n");
    }

    // -----------------------------------------
    // Find screenshot attachment
    // -----------------------------------------

    const screenshot = result.attachments.find(
      (attachment) =>
        attachment.path &&
        (
          attachment.contentType === "image/png" ||
          attachment.name === "screenshot"
        ),
    );

    // -----------------------------------------
    // Queue Jira update
    // -----------------------------------------

    this.results.push({
      testCaseId,
      jiraStatus,
      environment,
      executionDate,
      comment,
      screenshotPath: screenshot
        ? screenshot.path
        : null,
    });

    console.log(
      `[JIRA] Queued ${testCaseId} → ${jiraStatus}`,
    );
  }

  // -----------------------------------------
  // Perform Jira updates AFTER test run
  // -----------------------------------------

  async onEnd() {
    console.log(
      `\n[JIRA] Starting Jira updates for ${this.results.length} test(s)`,
    );

    // Nothing to update
    if (this.results.length === 0) {
      console.log(
        "[JIRA] No test results queued for Jira update.",
      );

      return;
    }

    // -----------------------------------------
    // Process each test
    // -----------------------------------------

    for (const execution of this.results) {
      try {
        console.log(
          `[JIRA] Updating ${execution.testCaseId} → ${execution.jiraStatus}`,
        );

        const issueKey = await updateTestCaseExecution({
          testCaseId: execution.testCaseId,

          status: execution.jiraStatus,

          environment: execution.environment,

          executionDate: execution.executionDate,

          comment: execution.comment,

          screenshotPath: execution.screenshotPath,
        });

        console.log(
          `[JIRA] ${execution.testCaseId} → ${issueKey} → ${execution.jiraStatus}`,
        );

        if (execution.screenshotPath) {
          console.log(
            `[JIRA] Screenshot attached to ${issueKey}`,
          );
        }
      } catch (error) {
        console.error(
          `[JIRA] Failed to update ${execution.testCaseId}:`,
          error.message,
        );

        if (error.response) {
          console.error(
            `[JIRA] Response status: ${error.response.status}`,
          );

          console.error(
            `[JIRA] Response data:`,
            error.response.data,
          );
        }
      }
    }

    console.log(
      "[JIRA] Jira processing completed",
    );
  }

  printsToStdio() {
    return false;
  }
}

module.exports = JiraReporter;
