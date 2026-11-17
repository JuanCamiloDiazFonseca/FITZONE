import { expect } from "@playwright/test";
import { test } from "./support/fixtures";

// Only these cases have no credentials, no authenticated cookies and no data.
test.use({ trace: { mode: "retain-on-failure", screenshots: false, snapshots: true, sources: false } });

test("E2E-03 | CA-E2E-PRIVATE-01 | rutas privadas sin sesion", async ({ page }) => {
  for (const route of ["/", "/usuarios", "/membresias", "/pagos"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Iniciar sesión", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).not.toBeVisible();
  }
});

test("E2E-08 | CA-E2E-FORM-01 | formulario vacio no envia login", async ({ page }) => {
  let loginRequests = 0;
  page.on("request", request => { if (request.url().endsWith("/auth/login") && request.method() === "POST") loginRequests++; });
  await page.goto("/login");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByLabel("Correo electrónico", { exact: true })).toBeFocused();
  expect(await page.getByLabel("Correo electrónico", { exact: true }).evaluate(input => (input as HTMLInputElement).checkValidity())).toBe(false);
  expect(loginRequests).toBe(0);
  await expect(page).toHaveURL(/\/login$/);
});
