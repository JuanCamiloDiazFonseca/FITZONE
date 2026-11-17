import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

type Manifest = {
  runId: string;
  prefix: string;
  admin: { id: string; email: string };
  users: { id: string; email: string; kind: "public" | "admin-activation"; document?: string | null }[];
  memberships: { id: string; userId: string }[];
  payments: { id: string; userId: string; membershipId: string }[];
};

test("P15.1-01 | registro público, roles, panel personal e integración administrativa E23", async ({ page }) => {
  const api = process.env.E2E_API_BASE_URL!;
  const prefix = process.env.P151_PREFIX!;
  const manifestPath = process.env.P151_MANIFEST!;
  const screenshotDir = process.env.P151_SCREENSHOT_DIR!;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Manifest;
  fs.mkdirSync(screenshotDir, { recursive: true });
  const suffix = prefix.toLowerCase();
  const userA = { name: `Cliente Publico ${suffix}`, email: `${suffix}-publico@e2e.invalid` };
  const userB = { name: `Cliente Activacion ${suffix}`, email: `${suffix}-activacion@e2e.invalid`, document: `${prefix}-B`, phone: "3000000000" };
  const passwordA = `P151-${randomBytes(16).toString("base64url")}!`;
  const passwordB = `P151-${randomBytes(16).toString("base64url")}!`;
  const blockedWrites: string[] = [];
  const writeCounts = { register: 0, login: 0, logout: 0, users: 0, memberships: 0, payments: 0 };
  let userAId = "";
  let userBId = "";
  let membershipId = "";

  await page.context().route("**/api/v1/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) { await route.continue(); return; }
    if (method === "POST" && url.pathname === "/api/v1/auth/register") {
      const body = request.postDataJSON() as { email?: string };
      if (body.email?.startsWith(`${suffix}-`) && body.email.endsWith("@e2e.invalid") && ++writeCounts.register <= 3) { await route.continue(); return; }
    }
    if (method === "POST" && url.pathname === "/api/v1/auth/login") {
      if (++writeCounts.login <= 8) { await route.continue(); return; }
    }
    if (method === "POST" && url.pathname === "/api/v1/auth/logout") {
      if (++writeCounts.logout <= 8) { await route.continue(); return; }
    }
    if (method === "POST" && url.pathname === "/api/v1/users") {
      const body = request.postDataJSON() as { document?: string; email?: string };
      if (body.document?.startsWith(prefix) && body.email?.startsWith(`${suffix}-`) && ++writeCounts.users <= 1) { await route.continue(); return; }
    }
    if (method === "POST" && url.pathname === "/api/v1/memberships") {
      const body = request.postDataJSON() as { userId?: string };
      if (userAId && body.userId === userAId && ++writeCounts.memberships <= 1) { await route.continue(); return; }
    }
    if (method === "POST" && url.pathname === "/api/v1/payments") {
      const body = request.postDataJSON() as { userId?: string; membershipId?: string };
      if (userAId && membershipId && body.userId === userAId && body.membershipId === membershipId && ++writeCounts.payments <= 1) { await route.continue(); return; }
    }
    blockedWrites.push(`${method} ${url.pathname}`);
    await route.abort("blockedbyclient");
  });

  const capture = async (file: string, masks: string[] = []) => {
    const mask = masks.map(email => page.getByText(email, { exact: true }));
    await page.screenshot({ path: path.join(screenshotDir, file), fullPage: true, animations: "disabled", mask });
  };
  const registerInUI = async (user: { name: string; email: string }, password: string) => {
    await page.goto("/registro");
    await page.getByLabel(/Nombre completo/).fill(user.name);
    await page.getByLabel(/Correo electr/).fill(user.email);
    await page.getByLabel(/^Contrase/).fill(password);
    await page.getByLabel(/Confirmar contrase/).fill(password);
    const responsePromise = page.waitForResponse(response => response.url() === `${api}/auth/register` && response.request().method() === "POST");
    await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
    const response = await responsePromise;
    return { response, body: await response.json() as { id?: string; email?: string } };
  };
  const signOut = async () => {
    const button = page.getByRole("button", { name: /Cerrar sesi/ });
    await button.click();
    await expect(page).toHaveURL(/\/login$/);
  };
  const loginAdmin = async () => {
    await page.goto("/login");
    await page.getByLabel(/Correo electr/).fill(process.env.INITIAL_ADMIN_EMAIL!);
    await page.getByLabel(/^Contrase/).fill(process.env.INITIAL_ADMIN_PASSWORD!);
    const responsePromise = page.waitForResponse(response => response.url() === `${api}/auth/login` && response.request().method() === "POST");
    await page.getByRole("button", { name: "Iniciar sesi", exact: false }).click();
    expect((await responsePromise).status()).toBe(201);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: /Bienvenido a FITZONE/ })).toBeVisible();
  };
  const saveManifest = () => fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  await page.goto("/registro");
  await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible();
  await capture("01_registro-publico.png");
  const createdA = await registerInUI(userA, passwordA);
  expect(createdA.response.status()).toBe(201);
  expect(createdA.body.id).toBeTruthy();
  userAId = createdA.body.id!;
  manifest.users.push({ id: userAId, email: userA.email, kind: "public", document: null });
  saveManifest();
  await expect(page).toHaveURL(/\/cliente$/);
  await expect(page.getByRole("heading", { name: new RegExp(userA.name) })).toBeVisible();
  const clientCookie = (await page.context().cookies(`http://localhost:3101`)).find(cookie => cookie.name === "fitzone_session");
  expect(clientCookie?.httpOnly).toBe(true);
  expect(clientCookie?.sameSite).toBe("Lax");

  const duplicateStatus = await page.evaluate(async ({ apiUrl, email, password, name }) => {
    const response = await fetch(`${apiUrl}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
    return response.status;
  }, { apiUrl: api, email: userA.email, name: userA.name, password: passwordA });
  expect(duplicateStatus).toBe(409);
  const wrongPasswordStatus = await page.evaluate(async ({ apiUrl, email }) => {
    const response = await fetch(`${apiUrl}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "clave-incorrecta-sintetica" }) });
    return response.status;
  }, { apiUrl: api, email: userA.email });
  expect(wrongPasswordStatus).toBe(401);

  await signOut();
  await loginAdmin();
  await page.getByRole("link", { name: "Usuarios", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Usuarios", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Nuevo usuario/ }).click();
  const userDialog = page.getByRole("dialog", { name: "Registrar usuario" });
  await userDialog.getByLabel("Nombre completo").fill(userB.name);
  await userDialog.getByLabel("Documento", { exact: true }).fill(userB.document);
  await userDialog.getByLabel(/Tel/).fill(userB.phone);
  await userDialog.getByLabel(/Correo electr/).fill(userB.email);
  const createAdminUser = page.waitForResponse(response => response.url() === `${api}/users` && response.request().method() === "POST");
  await userDialog.getByRole("button", { name: "Registrar usuario", exact: true }).click();
  const adminUserResponse = await createAdminUser;
  expect(adminUserResponse.status()).toBe(201);
  const adminUserBody = await adminUserResponse.json() as { id: string; email: string };
  userBId = adminUserBody.id;
  manifest.users.push({ id: userBId, email: userB.email, kind: "admin-activation", document: userB.document });
  saveManifest();
  await expect(page.getByRole("row").filter({ hasText: userB.email })).toBeVisible();
  await capture("02_usuario-visible-en-administracion.png", [userA.email, userB.email]);
  await signOut();

  const activatedB = await registerInUI(userB, passwordB);
  expect(activatedB.response.status()).toBe(201);
  expect(activatedB.body.id).toBe(userBId);
  await expect(page).toHaveURL(/\/cliente$/);
  const profileB = await page.request.get(`${api}/auth/me`);
  expect(profileB.status()).toBe(200);
  expect(await profileB.json()).toMatchObject({ id: userBId, email: userB.email });
  await signOut();
  await loginAdmin();
  const usersResponse = await page.request.get(`${api}/users?page=1&limit=20`);
  expect(usersResponse.status()).toBe(200);
  const usersBody = await usersResponse.json() as { data: { id: string }[]; pagination: { total: number } };
  expect(usersBody.pagination.total).toBe(2);
  expect(usersBody.data).toHaveLength(2);

  await page.getByRole("link", { name: /^Membres/ }).click();
  await page.getByRole("button", { name: /Nueva membres/ }).click();
  const membershipDialog = page.getByRole("dialog", { name: "Nueva membresía" });
  await membershipDialog.getByRole("combobox", { name: "Usuario" }).selectOption({ label: userA.name });
  await membershipDialog.getByRole("combobox", { name: "Plan" }).selectOption({ index: 1 });
  const bogotaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  await membershipDialog.getByLabel("Fecha de inicio").fill(bogotaDate);
  const membershipResponsePromise = page.waitForResponse(response => response.url() === `${api}/memberships` && response.request().method() === "POST");
  await membershipDialog.getByRole("button", { name: /Registrar membres/ }).click();
  const membershipResponse = await membershipResponsePromise;
  expect(membershipResponse.status()).toBe(201);
  const membershipBody = await membershipResponse.json() as { id: string; userId: string };
  expect(membershipBody.userId).toBe(userAId);
  membershipId = membershipBody.id;
  manifest.memberships.push({ id: membershipId, userId: userAId });
  saveManifest();
  await expect(page.getByRole("status")).toContainText(/membres.a se registr/i);
  await capture("04_membresia-asignada-administracion.png", [userA.email, userB.email]);

  await page.getByRole("link", { name: "Pagos", exact: true }).click();
  await page.getByRole("button", { name: "Nuevo pago", exact: true }).click();
  const paymentDialog = page.getByRole("dialog", { name: "Registrar pago" });
  await paymentDialog.getByRole("combobox", { name: "Usuario" }).selectOption({ label: userA.name });
  await paymentDialog.getByRole("combobox", { name: /Membres/ }).selectOption({ index: 1 });
  await paymentDialog.getByLabel(/Importe/).fill("110000");
  await paymentDialog.getByRole("combobox", { name: /M[ée]todo/ }).selectOption("CASH");
  const paymentResponsePromise = page.waitForResponse(response => response.url() === `${api}/payments` && response.request().method() === "POST");
  await paymentDialog.getByRole("button", { name: "Registrar pago", exact: true }).click();
  const paymentResponse = await paymentResponsePromise;
  expect(paymentResponse.status()).toBe(201);
  const paymentBody = await paymentResponse.json() as { id: string; userId: string; membershipId: string };
  expect(paymentBody).toMatchObject({ userId: userAId, membershipId });
  manifest.payments.push({ id: paymentBody.id, userId: userAId, membershipId });
  saveManifest();

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page.getByText("Usuarios nuevos del mes")).toBeVisible();
  const dashboard = await page.request.get(`${api}/dashboard`);
  expect(dashboard.status()).toBe(200);
  const dashboardBody = await dashboard.json() as { metrics: { totalUsers: number; newUsersThisMonth: number | null; activeMemberships: number; totalRevenue: string } };
  expect(dashboardBody.metrics).toMatchObject({ totalUsers: 2, newUsersThisMonth: 2, activeMemberships: 1, totalRevenue: "110000.00" });
  const totalRevenueCard = page.locator("article").filter({ has: page.getByText("Ingresos totales", { exact: true }) });
  await expect(totalRevenueCard).toContainText("110.000");
  await capture("05_dashboard-administrativo-estadisticas.png", [userA.email, userB.email]);

  await signOut();
  await page.goto("/login");
  await expect(page.locator("form")).toBeVisible();
  await capture("03_login-cliente.png");
  await page.getByLabel(/Correo electr/).fill(userA.email);
  await page.getByLabel(/^Contrase/).fill(passwordA);
  const loginA = page.waitForResponse(response => response.url() === `${api}/auth/login` && response.request().method() === "POST");
  await page.getByRole("button", { name: "Iniciar sesi", exact: false }).click();
  expect((await loginA).status()).toBe(201);
  await expect(page).toHaveURL(/\/cliente$/);
  await expect(page.getByText("Plan Mensual")).toBeVisible();
  await expect(page.getByText("110.000").last()).toBeVisible();
  await capture("06_panel-cliente-membresia.png", [userA.email]);
  await expect(page.getByRole("heading", { name: "Mi historial de pagos" })).toBeVisible();
  await capture("07_historial-pagos-cliente.png", [userA.email]);
  const ownProfileA = await page.request.get(`${api}/auth/me`);
  expect(await ownProfileA.json()).toMatchObject({ id: userAId, email: userA.email });
  const deniedPaths = ["/dashboard", "/users", "/memberships", "/payments", `/users/${userBId}`];
  const deniedStatuses = [] as number[];
  for (const endpoint of deniedPaths) {
    const response = await page.request.get(`${api}${endpoint}`);
    deniedStatuses.push(response.status());
    expect(response.status()).toBe(403);
  }

  await signOut();
  await page.goto("/login");
  await page.getByLabel(/Correo electr/).fill(userB.email);
  await page.getByLabel(/^Contrase/).fill(passwordB);
  const loginB = page.waitForResponse(response => response.url() === `${api}/auth/login` && response.request().method() === "POST");
  await page.getByRole("button", { name: "Iniciar sesi", exact: false }).click();
  expect((await loginB).status()).toBe(201);
  await expect(page).toHaveURL(/\/cliente$/);
  const ownProfileB = await page.request.get(`${api}/auth/me`);
  const profileBBody = await ownProfileB.json() as { id: string; payments: unknown[]; memberships: unknown[] };
  expect(profileBBody.id).toBe(userBId);
  expect(profileBBody.payments).toHaveLength(0);
  expect(profileBBody.memberships).toHaveLength(0);
  const crossUserResponse = await page.request.get(`${api}/users/${userAId}`);
  expect(crossUserResponse.status()).toBe(403);
  await expect(page.getByText(/Aún no tienes una membresía asignada/)).toBeVisible();
  await expect(page.getByText(/Todavía no hay pagos registrados/)).toBeVisible();

  await signOut();
  await page.goto("/cliente");
  await expect(page).toHaveURL(url => url.pathname === "/login");
  expect(blockedWrites).toEqual([]);
  fs.writeFileSync(path.join(path.dirname(manifestPath), "integration-checks.json"), JSON.stringify({
    runId: manifest.runId,
    status: "PASS",
    checks: {
      publicRegistration: "PASS", duplicateEmailRejected: "PASS", customerLogin: "PASS", wrongPasswordRejected: "PASS",
      adminCreatedAccountActivatedWithoutDuplicate: "PASS", adminUserListAndCount: "PASS", membershipAssignmentVisibleToCustomer: "PASS",
      realPaymentVisibleOnlyToOwner: "PASS", dashboardNewUserAndRevenueMetrics: "PASS", customerAdminRouteDenials: deniedStatuses,
      crossCustomerReadDenied: crossUserResponse.status(), boundedBusinessWrites: writeCounts, unauthorizedWritesBlocked: blockedWrites.length,
    },
  }, null, 2) + "\n");
});
