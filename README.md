Precondition
Node 14+ above should be installed

Execute below command
npm install

To execute test
npx playwright ./test/filename

----------------------------------------------------------------------------------

for kiwi
in node modules
node_modules
└── @kiwi-tcms-ai
└── kiwi-tcms-reporter
└── dist
└── sync.js ← MODIFY THIS FILE
change this in applyResult()
----const stop = new Date();
const start = new Date(
stop.getTime() - Math.max(0, t.durationMs ?? 0)
);

await this.client.call("TestExecution.update", [
executionId,
{
status: statusId,

    // Kiwi instance has USE_TZ=False
    start_date: start.toISOString().replace("Z", ""),
    stop_date: stop.toISOString().replace("Z", ""),

},
]);

--------------------------------------------------------------------------------------------------

for kiwi in node modules change 
D:\playwright\PlaywrightDemo-main\node_modules\@kiwi-tcms-ai\kiwi-tcms-reporter\dist\reporters.js

onTestEnd(test, result) {
    const errs = result.errors?.length ? result.errors : result.error ? [result.error] : [];

    this.collected.push({
        title: test.title ?? "unknown",
        fullTitle: (test.titlePath?.() ?? [test.title ?? ""]).join(" > "),
        file: test.location?.file,
        status: normalizeStatus(result.status),
        durationMs: result.duration,
        error: errs
            .map((e) => e.stack || e.message || "")
            .join("\n")
            .trim() || undefined,

        // Capture Playwright attachments
        attachments: result.attachments ?? [],

        tags: test.tags,
    });
}


--------------------------------------------------------------------------------------------

for kiwi
in node modules
node_modules
└── @kiwi-tcms-ai
└── kiwi-tcms-reporter
└── dist
└── sync.js ← MODIFY THIS FILE

after this code 
if (isFailure && t.error && opts.commentFailures !== false) {
    ...
}
add this function 
if (isFailure && t.attachments?.length) {
    for (const attachment of t.attachments) {
        if (!attachment?.path) {
            continue;
        }

        try {
            const fs = await import("node:fs/promises");

            const content = await fs.readFile(attachment.path);
            const b64content = content.toString("base64");

            const filename =
                attachment.name ||
                attachment.path.split(/[\\/]/).pop() ||
                "playwright-attachment";

            await this.client.call("TestExecution.add_attachment", [
                executionId,
                filename,
                b64content,
            ]);

            console.log(
                `[kiwi] attached: ${filename}`
            );
        } catch (attachmentError) {
            console.error(
                `[kiwi] attachment failed: ${attachment.path}`,
                attachmentError
            );
        }
    }
}