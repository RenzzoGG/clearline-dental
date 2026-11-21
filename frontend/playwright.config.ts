import { defineConfig, devices } from "@playwright/test";

// The config runs in Node, but the project has no @types/node (not an approved
// dependency): declare just the bit of `process` used here.
declare const process: { env: Record<string, string | undefined> };

/**
 * End-to-end smoke tests against the production image (docker-compose.e2e.yml), as CI runs
 * them. Locally:
 *
 *   E2E_SECRET_KEY=... docker compose -f docker-compose.e2e.yml up --build -d --wait
 *   docker compose -f docker-compose.e2e.yml exec web python manage.py reset_demo
 *   npx playwright test
 *
 * Files are *.e2e.ts so Vitest (unit tests) never picks them up.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  outputDir: "./e2e/test-results",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8088",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
