import { expect } from "@playwright/test";
import { test, login, hasCredentials, createUserThroughUI, apiBase } from "./support/fixtures";
import { writesAuthorized } from "./support/isolated-data";

test.skip(!writesAuthorized() || !hasCredentials, "REQUIERE_AUTORIZACION: base aislada, credenciales y limpieza aprobada.");

test("E2E-04 | CA-E2E-USR-01 | @write login registrar usuario y verificar", async ({ page, data }) => {
  await login(page);
  const user = await createUserThroughUI(page, data, "usuario");
  await expect(page.getByRole("row").filter({ hasText: user.document })).toContainText(user.email);
  const persisted = await page.request.get(`${apiBase}/users/${user.id}`);
  expect(persisted.status()).toBe(200);
  expect(await persisted.json()).toMatchObject({ id: user.id, document: user.document, email: user.email });
});

test("E2E-05 | CA-E2E-MEM-01 | @write login registrar membresia y verificar", async ({ page, data }) => {
  await login(page);
  const user = await createUserThroughUI(page, data, "membresia");
  await page.getByRole("link", { name: "Membresías", exact: true }).click();
  await page.getByRole("button", { name: /Nueva membresía/ }).click();
  const dialog = page.getByRole("dialog", { name: "Nueva membresía" });
  await expect(dialog.getByRole("combobox", { name: /^Usuario/ })).toBeEnabled();
  await dialog.getByRole("combobox", { name: /^Usuario/ }).selectOption({ label: user.name });
  await expect(dialog.getByRole("combobox", { name: /^Plan/ })).toBeEnabled();
  await dialog.getByRole("combobox", { name: /^Plan/ }).selectOption({ index: 1 });
  await dialog.getByLabel("Fecha de inicio").fill(new Date().toISOString().slice(0, 10));
  const response = page.waitForResponse(response => response.url() === `${apiBase}/memberships` && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Registrar membresía", exact: true }).click();
  const saved = await response;
  expect(saved.status()).toBe(201);
  const body = await saved.json();
  data.memberships.push({ id: body.id, userId: user.id });
  expect(body.userId).toBe(user.id);
  await expect(page.getByRole("status")).toHaveText("La membresía se registró correctamente.");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("textbox", { name: "Buscar por usuario o plan" }).fill(user.name);
  await expect(page.getByRole("cell", { name: user.name, exact: true })).toBeVisible();
});
