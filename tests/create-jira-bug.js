const { createJiraBug } = require("../utils/jira");

async function main() {

    await createJiraBug(
        "Test bug created from Playwright",
        "This is a test Jira bug created using the Jira REST API."
    );

}

main();