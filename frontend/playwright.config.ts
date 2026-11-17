import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 12000 },
  outputDir: "../evidencias/punto-13/artifacts",
  reporter: [["./e2e/safe-reporter.ts"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    ...devices["Desktop Chrome"],
    headless: true,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium" }],
});
