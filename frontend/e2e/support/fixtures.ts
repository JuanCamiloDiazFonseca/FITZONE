import { test as base, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { cleanupOwnedData, runPrefix, writesAuthorized, verifyIsolatedConfiguration, type Manifest } from "./isolated-data";

export const apiBase = process.env.E2E_API_BASE_URL ?? "http://localhost:3001/api/v1";
export const hasCredentials = Boolean(process.env.INITIAL_ADMIN_EMAIL && process.env.INITIAL_ADMIN_PASSWORD);
type Fixtures = { data: Manifest; networkGuard: void };
export const test = base.extend<Fixtures>({
  data: async ({ browserName }, provide, testInfo) => {
    void browserName;
    if (writesAuthorized()) verifyIsolatedConfiguration();
    const manifest: Manifest = { users: [], memberships: [] };
    try {
      await provide(manifest);
    } finally {
      if (manifest.users.length || manifest.memberships.length) {
        fs.writeFileSync(testInfo.outputPath("fixtures-manifest.json"), JSON.stringify(manifest, null, 2));
        const receipt = await cleanupOwnedData(manifest);
        fs.writeFileSync(testInfo.outputPath("cleanup-receipt.json"), JSON.stringify(receipt, null, 2));
      }
    }
  },
  networkGuard: [async ({ context, data }, provide) => {
    let blocked = 0;
    await context.route("**/api/v1/**", async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== new URL(apiBase).origin) { blocked++; await route.abort(); return; }
      const method = request.method();
      const auth = method === "POST" && ["/api/v1/auth/login", "/api/v1/auth/logout"].includes(url.pathname);
      if (["GET", "HEAD", "OPTIONS"].includes(method) || auth) { await route.continue(); return; }
      if (writesAuthorized() && method === "POST") {
        const body = request.postDataJSON();
        if (url.pathname === "/api/v1/users" && String(body.document).startsWith(runPrefix) && String(body.email).endsWith("@e2e.invalid")) { await route.continue(); return; }
        if (url.pathname === "/api/v1/memberships" && data.users.some(user => user.id === body.userId)) { await route.continue(); return; }
      }
      blocked++;
      await route.abort();
    });
    await provide();
    expect(blocked, "No debe haber intentos de escritura no autorizados").toBe(0);
  }, { auto: true }],
});

export async function login(page: Page) {
  if (!hasCredentials) throw new Error("Se requieren credenciales efimeras del administrador existente.");
  await page.goto("/login");
  await page.getByLabel("Correo electrónico", { exact: true }).fill(process.env.INITIAL_ADMIN_EMAIL!);
  await page.getByLabel("Contraseña", { exact: true }).fill(process.env.INITIAL_ADMIN_PASSWORD!);
  const response = page.waitForResponse(response => response.url() === `${apiBase}/auth/login` && response.request().method() === "POST");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  expect((await response).status()).toBe(201);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: /Bienvenido a FITZONE/ })).toBeVisible();
}

export async function createUserThroughUI(page: Page, data: Manifest, suffix: string) {
  const document = `${runPrefix}-${suffix}`;
  const user = { name: `Prueba ${document}`, document, phone: "3000000000", email: `${document.toLowerCase()}@e2e.invalid` };
  await page.getByRole("link", { name: "Usuarios", exact: true }).click();
  await page.getByRole("button", { name: /Nuevo usuario/ }).click();
  const dialog = page.getByRole("dialog", { name: "Registrar usuario" });
  await dialog.getByLabel("Nombre completo").fill(user.name);
  await dialog.getByLabel("Documento", { exact: true }).fill(user.document);
  await dialog.getByLabel("Teléfono").fill(user.phone);
  await dialog.getByLabel("Correo electrónico").fill(user.email);
  const response = page.waitForResponse(response => response.url() === `${apiBase}/users` && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Registrar usuario", exact: true }).click();
  const saved = await response;
  expect(saved.status()).toBe(201);
  const body = await saved.json();
  data.users.push({ id: body.id, document: user.document, email: user.email });
  await expect(page.getByRole("status")).toHaveText("Usuario registrado correctamente.");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("textbox", { name: "Buscar usuarios en esta página" }).fill(document);
  await expect(page.getByText(user.name, { exact: true })).toBeVisible();
  return { ...user, id: body.id as string };
}
