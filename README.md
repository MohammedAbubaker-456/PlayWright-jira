Precondition
Node 14+ above should be installed

Execute below command
npm install

To execute test
npx playwright ./test/filename

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
