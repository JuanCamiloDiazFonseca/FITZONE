import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/customer-journey.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  outputDir: "../evidencias/punto-15.1/e23/artifacts",
  reporter: [["./e2e/safe-reporter.ts"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    ...devices["Desktop Chrome"],
    headless: true,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium" }],
});
