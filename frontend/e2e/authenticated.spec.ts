import { expect } from "@playwright/test";
import { test, login, hasCredentials, apiBase } from "./support/fixtures";

test.skip(!hasCredentials, "Requiere credenciales efimeras; no se guardan en el proyecto.");

test("E2E-01 | CA-E2E-AUTH-01 | login valido y dashboard", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "Usuarios", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toBeVisible();
});

test("E2E-02 | CA-E2E-AUTH-02 | rechazo de credenciales incorrectas", async ({ page }) => {
  await page.goto("/login");
  const original = process.env.INITIAL_ADMIN_PASSWORD!;
  const wrong = (original[0] === "x" ? "y" : "x") + original.slice(1);
  await page.getByLabel("Correo electrónico", { exact: true }).fill(process.env.INITIAL_ADMIN_EMAIL!);
  await page.getByLabel("Contraseña", { exact: true }).fill(wrong);
  const response = page.waitForResponse(response => response.url() === `${apiBase}/auth/login`);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  expect((await response).status()).toBe(401);
  await expect(page.getByRole("alert").filter({ hasText: "Correo o contraseña incorrectos." })).toHaveText("Correo o contraseña incorrectos.");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).not.toBeVisible();
});

test("E2E-06 | CA-E2E-NAV-01 | login y consulta de los tres modulos", async ({ page }) => {
  await login(page);
  for (const [name, route, resource] of [["Usuarios", "/usuarios", "users"], ["Membresías", "/membresias", "memberships"], ["Pagos", "/pagos", "payments"]]) {
    const response = page.waitForResponse(response => response.url().startsWith(`${apiBase}/${resource}?`) && response.request().method() === "GET");
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    expect((await response).status()).toBe(200);
    await expect(page.getByRole("heading", { name, exact: true, level: 1 })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("table").getByText(/Cargando/)).not.toBeVisible();
  }
});

test("E2E-07 | CA-E2E-SESSION-01 | logout impide volver a usuarios", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: /Nuevo usuario/ })).not.toBeVisible();
});
