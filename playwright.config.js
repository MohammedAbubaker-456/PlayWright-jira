// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */

require("dotenv").config();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  expect: {
    timeout: 4000,
  },

  testDir: "./tests",

  timeout: 20000,

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    ["allure-playwright"],
    ["./reporters/jira-reporter.js"],
    // [
    //   "@kiwi-tcms-ai/kiwi-tcms-reporter/playwright",
    //   {
    //     plan: 1,
    //     build: "playwright-test",
    //     matchBy: "title",
    //     createMissing: false,
    //   },
    // ],
  ],
  // ['html']],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ignoreHTTPSErrors: true,
    // video:"on"
  },

  /* Configure projects for major browsers */
  //  projects: [
  // {
  //   name: 'chromium',
  //   use: { ...devices['Desktop Chrome'] },
  // },
  // {
  //   name: 'firefox',
  //   use: { ...devices['Desktop Firefox'] },
  // },
  // {
  //   name: 'webkit',
  //   use: { ...devices['Desktop Safari'] },
  // },
  // ],

  projects: [
    //   {
    //     name: 'chromium',
    //     use: { ...devices['Desktop Chrome'] },
    //   },
    //   {
    //     name: 'firefox',
    //     use: { ...devices['Desktop Firefox'] },
    //   },
    //   {
    //     name: 'webkit',
    //     use: { ...devices['Desktop Safari'] },
    //   },
    // {
    //   name: "Microsoft Edge",
    //   use: {
    //     ...devices["Desktop Edge"],
    //     channel: "msedge",
    //   },
    // },
    //   },
    // {
    //   name: "Google Chrome",
    //   use: {
    //     ...devices["Desktop Chrome"],
    //     channel: "chrome",
    //   },
    // },
    {
      name: "Desktop",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: {
          width: 1920,
          height: 1080,
        },
      },
    },

    // {
    //   name: "Tablet",
    //   use: {
    //     ...devices["Desktop Chrome"],
    //     channel: "chrome",
    //     viewport: {
    //       width: 768,
    //       height: 1024,
    //     },
    //   },
    // },

    // {
    //   name: "Mobile",
    //   use: {
    //     ...devices["Pixel 5"],
    //   },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
