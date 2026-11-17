import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const captureDir = path.resolve(process.cwd(), "../evidencias/punto-15.1/main-3000/capturas");
fs.mkdirSync(captureDir, { recursive: true });

test("public login and registration pages work without submitting data", async ({ page }) => {
  const apiWrites: string[] = [];
  const browserErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && new URL(request.url()).port === "3001") apiWrites.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  page.on("requestfailed", (request) => failedRequests.push(request.url()));

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login");
  await expect(page.getByText("BIENVENIDO A FITZONE", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "¿No tienes cuenta? Regístrate aquí" })).toHaveAttribute("href", "/registro");
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await page.screenshot({ path: path.join(captureDir, "login-actualizado-3000.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByText("BIENVENIDO A FITZONE", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "¿No tienes cuenta? Regístrate aquí" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: path.join(captureDir, "login-movil-3000.png"), fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/registro");
  await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible();
  await expect(page.getByLabel("Nombre completo")).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Confirmar contraseña")).toBeVisible();
  await expect(page.getByRole("link", { name: "¿Ya tienes cuenta? Inicia sesión" })).toHaveAttribute("href", "/login");
  await page.screenshot({ path: path.join(captureDir, "registro-funcionando-3000.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: path.join(captureDir, "registro-movil-3000.png"), fullPage: true });
  expect(apiWrites, "La comprobación visual no debe enviar formularios ni escribir en la API").toEqual([]);
  expect(browserErrors, "Login y registro no deben producir errores de navegador").toEqual([]);
  expect(failedRequests, "Login y registro no deben tener recursos fallidos").toEqual([]);
});

async function mockRoleApi(page: Page, role: "ADMIN" | "CUSTOMER") {
  const dashboard = {
    generatedAt: "2026-11-17T12:00:00.000Z", timeZone: "America/Bogota", alertWindowDays: 5,
    metrics: { totalUsers: 0, activeMemberships: 0, upcomingMemberships: 0, expiredMemberships: 0, totalRevenue: "0", currentMonthRevenue: "0", newUsersThisMonth: 0, usersWithoutRegistrationDate: 0, registrationDatesAvailable: true },
    comparison: { previousMonthRevenue: "0", percentage: null, basis: "none" },
    revenueByMonth: [], expiringMemberships: [], users: [], recentPayments: [],
  };
  await page.route("**/api/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/auth/session")) return route.fulfill({ json: { role } });
    if (pathname.endsWith("/auth/me")) return route.fulfill({ json: { id: "synthetic-ui-only", name: "Cliente de vista", email: "ui-only@example.invalid", phone: null, createdAt: null, memberships: [], payments: [] } });
    if (pathname.endsWith("/plans")) return route.fulfill({ json: { data: [] } });
    if (pathname.endsWith("/dashboard")) return route.fulfill({ json: dashboard });
    return route.fulfill({ json: { data: [] } });
  });
}

test("admin and customer roles remain in their separate UI portals", async ({ page }) => {
  await mockRoleApi(page, "ADMIN");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Bienvenido a FITZONE/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
  await page.goto("/cliente");
  await expect(page).toHaveURL(/\/$/);

  await page.unrouteAll();
  await mockRoleApi(page, "CUSTOMER");
  await page.goto("/cliente");
  await expect(page.getByRole("heading", { name: "Hola, Cliente de vista" })).toBeVisible();
  await expect(page.getByText("Portal de cliente")).toBeVisible();
  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/cliente$/);
  await expect(page.getByRole("heading", { name: "Hola, Cliente de vista" })).toBeVisible();
});
