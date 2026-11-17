import fs from "node:fs";
import path from "node:path";
import type { FullResult, Reporter, Suite, TestCase, TestResult, TestStep } from "@playwright/test/reporter";

type Row = { id: string; title: string; file: string; line: number; status: string; durationMs: number; trace?: string; diagnostic?: string };
type SafeStep = { phase: string; category: string; line?: number; failed?: boolean; at: string };
const out = path.resolve(process.env.FITZONE_E2E_REPORT_DIR ?? path.resolve(process.cwd(), "../evidencias/punto-13"));
const escape = (input: string) => input.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export default class SafeReporter implements Reporter {
  private rows: Row[] = [];
  private steps = new Map<string, SafeStep[]>();
  private startedAt = new Date().toISOString();
  private globalErrors = 0;

  onBegin(_config: unknown, suite: Suite) {
    fs.mkdirSync(out, { recursive: true });
    this.rows = suite.allTests().map(test => ({ id: test.title.split(" | ")[0], title: test.title,
      file: path.relative(process.cwd(), test.location.file).replaceAll("\\", "/"), line: test.location.line,
      status: "notRun", durationMs: 0 }));
  }
  onStepBegin(test: TestCase, _result: TestResult, step: TestStep) {
    const list = this.steps.get(test.id) ?? [];
    list.push({ phase: "begin", category: step.category, line: step.location?.line, at: new Date().toISOString() });
    this.steps.set(test.id, list);
  }
  onStepEnd(test: TestCase, _result: TestResult, step: TestStep) {
    this.steps.get(test.id)?.push({ phase: "end", category: step.category, line: step.location?.line, failed: Boolean(step.error), at: new Date().toISOString() });
  }
  onError() { this.globalErrors++; }
  onTestEnd(test: TestCase, result: TestResult) {
    const row = this.rows.find(item => item.id === test.title.split(" | ")[0])!;
    row.status = result.status;
    row.durationMs = result.duration;
    // Do not export step titles, call arguments, console, error messages or DOM snapshots.
    for (const attachment of result.attachments) {
      if (!attachment.path) continue;
      const target = path.resolve(attachment.path);
      const artifacts = path.resolve(out, "artifacts") + path.sep;
      if (target.startsWith(artifacts) && path.basename(target) === "error-context.md" && fs.existsSync(target)) fs.unlinkSync(target);
      if (["E2E-03", "E2E-08"].includes(row.id) && attachment.name === "trace") row.trace = path.relative(out, target).replaceAll("\\", "/");
    }
    if (["failed", "timedOut", "interrupted"].includes(result.status)) {
      fs.mkdirSync(path.join(out, "safe-traces"), { recursive: true });
      row.diagnostic = `safe-traces/${row.id}.json`;
      fs.writeFileSync(path.join(out, row.diagnostic), JSON.stringify({ id: row.id, status: row.status, steps: this.steps.get(test.id) ?? [] }, null, 2));
    }
    console.log(`${row.id} ${row.status.toUpperCase()}`);
  }
  onEnd(result: FullResult) {
    const report = { runner: "Playwright", browser: "Chromium Headless Shell", startedAt: this.startedAt,
      completedAt: new Date().toISOString(), status: result.status, globalErrors: this.globalErrors,
      implemented: this.rows.length, executed: this.rows.filter(row => !["skipped", "notRun"].includes(row.status)).length,
      passed: this.rows.filter(row => row.status === "passed").length,
      failed: this.rows.filter(row => ["failed", "timedOut", "interrupted"].includes(row.status)).length,
      skipped: this.rows.filter(row => row.status === "skipped").length, tests: this.rows };
    fs.writeFileSync(path.join(out, "resultados-playwright.json"), JSON.stringify(report, null, 2));
    fs.mkdirSync(path.join(out, "html-report"), { recursive: true });
    fs.writeFileSync(path.join(out, "html-report/index.html"), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>FITZONE — Punto 13</title><style>body{font:16px system-ui;margin:40px;background:#101412;color:#edf3ee}table{border-collapse:collapse;width:100%}td,th{padding:12px;text-align:left;border:1px solid #435448}.passed{color:#b4f344}.failed,.timedOut{color:#ff9999}.skipped{color:#edcd87}a{color:#b4f344}</style><h1>FITZONE · Playwright E2E</h1><p>${report.implemented} implementadas · ${report.executed} ejecutadas · ${report.passed} aprobadas · ${report.failed} fallidas · ${report.skipped} omitidas.</p><p>Estado global: ${escape(report.status)}. Inicio UTC: ${escape(report.startedAt)}.</p><p>Reporte sanitizado mediante la API Reporter de Playwright. No contiene argumentos de fill, contraseñas, cabeceras, cookies, cuerpos de red ni mensajes crudos de error.</p><table><thead><tr><th>Caso</th><th>Resultado real</th><th>Duración</th><th>Código</th></tr></thead><tbody>${this.rows.map(row => `<tr><td>${escape(row.title)}</td><td class="${row.status}">${escape(row.status)}</td><td>${row.durationMs} ms</td><td>${escape(row.file)}:${row.line}</td></tr>`).join("")}</tbody></table><p>Las dos pruebas @write solo podrán ejecutarse con entorno aislado y autorización específica. Skipped no equivale a PASS. Las trazas completas solo están habilitadas en pruebas sin credenciales.</p></html>`);
    console.log(`Implementadas=${report.implemented}; ejecutadas=${report.executed}; PASS=${report.passed}; FAIL=${report.failed}; SKIP=${report.skipped}`);
  }
}
