import { expect } from "@playwright/test";
import { test, login, apiBase, hasCredentials } from "../e2e/support/fixtures";

const money = (value: string) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));

test("DASH-E2E-01 | CA-PRIVATE | endpoint de estadísticas requiere sesión", async ({ page }) => {
  const response = await page.request.get(`${apiBase}/dashboard`);
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body).not.toHaveProperty("metrics");
});

test("DASH-E2E-02 | CA-API-UI | cifras reales, filtro, enlaces y navegación móvil", async ({ page }) => {
  test.skip(!hasCredentials, "Requiere administrador existente, sin crear registros.");
  const responsePromise = page.waitForResponse(response => response.url() === `${apiBase}/dashboard` && response.request().method() === "GET");
  await login(page);
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  const m = body.metrics;
  for (const [label, value] of [["Total de usuarios", m.totalUsers.toLocaleString("es-CO")], ["Membresías activas", String(m.activeMemberships)], ["Próximas a vencer", String(m.upcomingMemberships)], ["Membresías vencidas", String(m.expiredMemberships)], ["Ingresos totales", money(m.totalRevenue)], ["Ingresos del mes", money(m.currentMonthRevenue)], ["Usuarios nuevos del mes", m.newUsersThisMonth === null ? "No disponible" : String(m.newUsersThisMonth)]]) {
    await expect(page.getByRole("article").filter({ has: page.getByText(label, { exact: true }) }).getByText(value, { exact: true })).toBeVisible();
  }
  expect(body.revenueByMonth).toHaveLength(12);
  await page.getByText("Ver valores mensuales", { exact: true }).click();
  const table = page.getByRole("table", { name: "Ingresos por mes" });
  await expect(table.getByRole("row")).toHaveCount(13);
  await page.getByRole("combobox", { name: "Período de ingresos" }).selectOption("3");
  await expect(table.getByRole("row")).toHaveCount(4);
  const monthLabel = (month: string) => new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", month: "short", year: "2-digit" }).format(new Date(`${month}-15T12:00:00Z`));
  for (const month of body.revenueByMonth.slice(-3)) {
    const row = table.getByRole("row").filter({ hasText: monthLabel(month.month) });
    await expect(row.getByRole("cell").nth(1)).toHaveText(String(month.payments));
    await expect(row.getByRole("cell").nth(2)).toHaveText(money(month.amount));
  }
  await expect(page.getByText(/Última consulta:/)).toBeVisible();
  const day = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  await expect(page.locator("time")).toContainText(day);
  await page.getByRole("combobox", { name: "Período de ingresos" }).selectOption("12");
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByLabel("Meses del gráfico").getByText(monthLabel(body.revenueByMonth.at(-1).month), { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("link", { name: "Usuarios", exact: true }).click();
  await expect(page).toHaveURL(/\/usuarios$/);
  await expect(page.getByRole("heading", { name: "Usuarios", exact: true })).toBeVisible();
});

test("DASH-E2E-03 | CA-ERROR | HTTP 503 muestra error y reintento recupera la API real", async ({ page }) => {
  test.skip(!hasCredentials, "Requiere administrador existente.");
  await page.route(`${apiBase}/dashboard`, route => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await login(page);
  await expect(page.getByRole("alert").filter({ hasText: "No se pudo cargar el resumen" })).toBeVisible();
  await page.unroute(`${apiBase}/dashboard`);
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.getByText("Total de usuarios", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "No se pudo cargar el resumen" })).toHaveCount(0);
});

test("DASH-E2E-04 | CA-SESSION | respuesta 401 del dashboard devuelve al login", async ({ page }) => {
  test.skip(!hasCredentials, "Requiere administrador existente.");
  await login(page);
  await expect(page.getByText("Total de usuarios", { exact: true })).toBeVisible();
  await page.route(`${apiBase}/dashboard`, route => route.fulfill({ status: 401, contentType: "application/json", body: "{}" }));
  await page.getByRole("button", { name: "Actualizar resumen" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Iniciar sesión", exact: true })).toBeVisible();
});
