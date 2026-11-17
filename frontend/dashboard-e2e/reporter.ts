import fs from "node:fs";
import path from "node:path";
import type { FullResult } from "@playwright/test/reporter";
import SafeReporter from "../e2e/safe-reporter";

/** Reuse the credential-safe reporter; label this separate validation correctly. */
export default class DashboardReporter extends SafeReporter {
  override onEnd(result: FullResult) {
    super.onEnd(result);
    const file = path.join(process.env.FITZONE_E2E_REPORT_DIR!, "html-report/index.html");
    const html = fs.readFileSync(file, "utf8")
      .replace("FITZONE — Punto 13", "FITZONE — Dashboard")
      .replace("FITZONE · Playwright E2E", "FITZONE · Validación del dashboard")
      .replace("Las dos pruebas @write solo podrán ejecutarse con entorno aislado y autorización específica.", "Esta configuración solo contiene comprobaciones sin escrituras de datos.");
    fs.writeFileSync(file, html);
  }
}
