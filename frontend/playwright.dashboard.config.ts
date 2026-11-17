import { defineConfig } from "@playwright/test";
import path from "node:path";
import base from "./playwright.config";
// Direct execution must never overwrite the academic Point 13 report.
const evidenceRoot = path.resolve(__dirname, "../evidencias/dashboard");
const reportDir = path.resolve(process.env.FITZONE_E2E_REPORT_DIR ?? path.join(evidenceRoot, "playwright-dashboard"));
if (reportDir !== evidenceRoot && !reportDir.startsWith(evidenceRoot + path.sep)) {
  throw new Error("Las validaciones del dashboard deben conservarse dentro de evidencias/dashboard.");
}
process.env.FITZONE_E2E_REPORT_DIR = reportDir;
export default defineConfig({
  ...base,
  testDir: "./dashboard-e2e",
  outputDir: "../evidencias/dashboard/playwright-dashboard/artifacts",
  reporter: [["./dashboard-e2e/reporter.ts"]],
  use: { ...base.use, trace: "off", screenshot: "off", video: "off" },
});
