import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { DashboardPage } from "@/components/dashboard-page";
import { ColombiaClock } from "@/components/colombia-clock";
import { authFetch } from "@/lib/auth-fetch";
import { renderToString } from "react-dom/server";
import { cop, type DashboardData } from "@/lib/dashboard";
import { deferredResponse, json, mockHttp } from "../support/http";

function summary(): DashboardData {
  return {
    generatedAt: "2026-11-16T14:30:00Z", timeZone: "America/Bogota", alertWindowDays: 5,
    metrics: { totalUsers: 27, activeMemberships: 8, upcomingMemberships: 2, expiredMemberships: 3, totalRevenue: "320000.50", currentMonthRevenue: "110000.50", newUsersThisMonth: null, usersWithoutRegistrationDate: null, registrationDatesAvailable: false },
    comparison: { previousMonthRevenue: "0", percentage: null, basis: "Mes en curso frente al mes anterior completo" },
    revenueByMonth: Array.from({ length: 12 }, (_, index) => ({ month: `${index === 0 ? 2025 : 2026}-${String(index === 0 ? 12 : index).padStart(2, "0")}`, amount: index === 11 ? "110000.50" : "0", payments: index === 11 ? 1 : 0 })),
    expiringMemberships: [{ id: "due-1", userName: "Ana Alerta", planType: "MONTHLY", expirationDate: "2026-11-19T16:00:00Z" }],
    users: [{ id: "person-1", name: "Luis Registrado", email: "luis@example.invalid", membership: null }],
    recentPayments: [{ id: "payment-1", userName: "Marta Pago", planType: "ANNUAL", amount: "110000.50", paidAt: "2026-11-16T04:30:00Z", method: "BANK_TRANSFER" }],
  };
}
function dashboardHttp(body = summary()) {
  return mockHttp((url) => {
    if (!url.pathname.endsWith("/dashboard")) throw Error("Ruta no prevista");
    return json(body);
  });
}
afterEach(() => { vi.useRealTimers(); });

test("DASH-01 | CA-STATS | muestra las siete métricas reales, sin inventar altas ni porcentajes", async () => {
  const http = dashboardHttp();
  render(<DashboardPage />);
  const card = await screen.findByText("Total de usuarios");
  expect(within(card.closest("article")!).getByText("27")).toBeVisible();
  expect(within(screen.getByText("Membresías activas").closest("article")!).getByText("8")).toBeVisible();
  expect(within(screen.getByText("Próximas a vencer").closest("article")!).getByText("2")).toBeVisible();
  expect(within(screen.getByText("Membresías vencidas").closest("article")!).getByText("3")).toBeVisible();
  expect(within(screen.getByText("Ingresos totales").closest("article")!).getByText(cop("320000.50"), { normalizer: value => value })).toBeVisible();
  expect(within(screen.getByText("Ingresos del mes").closest("article")!).getByText(cop("110000.50"), { normalizer: value => value })).toBeVisible();
  expect(screen.getByText("No disponible")).toBeVisible();
  expect(screen.getByText("Sin comparación")).toBeVisible();
  expect(screen.queryByText(/12,8%|ficticios|ilustrativos/)).not.toBeInTheDocument();
  expect(http).toHaveBeenCalledWith(expect.stringContaining("/dashboard"), expect.objectContaining({ credentials: "include", cache: "no-store" }));
});

test("DASH-02 | CA-LOAD | espera la API y deshabilita actualizar mientras carga", async () => {
  const pending = deferredResponse();
  mockHttp(() => pending.promise);
  render(<DashboardPage />);
  expect(await screen.findByText("Actualizando estadísticas…")).toBeVisible();
  expect(screen.getByRole("button", { name: "Actualizar resumen" })).toBeDisabled();
  expect(screen.queryByText("Total de usuarios")).not.toBeInTheDocument();
  await act(async () => pending.resolve(json(summary())));
  expect(await screen.findByText("Total de usuarios")).toBeVisible();
});

test("DASH-03 | CA-CHART | selector filtra 12, 6 y 3 meses con valores COP y año", async () => {
  dashboardHttp();
  const user = userEvent.setup();
  render(<DashboardPage />);
  await user.click(await screen.findByText("Ver valores mensuales"));
  const table = screen.getByRole("table", { name: "Ingresos por mes" });
  expect(within(table).getAllByRole("row")).toHaveLength(13);
  await user.selectOptions(screen.getByRole("combobox", { name: "Período de ingresos" }), "6");
  expect(within(table).getAllByRole("row")).toHaveLength(7);
  await user.selectOptions(screen.getByRole("combobox", { name: "Período de ingresos" }), "3");
  expect(within(table).getAllByRole("row")).toHaveLength(4);
  expect(within(table).getByText(/nov.*26/)).toBeVisible();
  expect(within(table).getByText(cop("110000.50"), { normalizer: value => value })).toBeVisible();
  expect(screen.getByRole("img", { name: "Ingresos reales de los últimos 3 meses" })).toBeVisible();
});

test("DASH-04 | CA-EMPTY | muestra ceros y mensajes al no existir registros", async () => {
  const body = summary();
  body.users = []; body.expiringMemberships = []; body.recentPayments = [];
  body.revenueByMonth.forEach((month) => { month.amount = "0"; month.payments = 0; });
  body.metrics = { ...body.metrics, totalUsers: 0, activeMemberships: 0, upcomingMemberships: 0, expiredMemberships: 0, totalRevenue: "0", currentMonthRevenue: "0" };
  dashboardHttp(body);
  render(<DashboardPage />);
  expect(await screen.findByText("No hay usuarios registrados.")).toBeVisible();
  expect(screen.getByText("No hay pagos registrados.")).toBeVisible();
  expect(screen.getByText("No hay pagos en este período.")).toBeVisible();
  expect(screen.getByText(/No hay membresías próximas/)).toBeVisible();
  expect(within(screen.getByText("Total de usuarios").closest("article")!).getByText("0")).toBeVisible();
});

test("DASH-05 | CA-ERROR | informa un error HTTP y permite reintentar sin datos ficticios", async () => {
  let attempts = 0;
  mockHttp(() => ++attempts === 1 ? json({}, 503) : json(summary()));
  const user = userEvent.setup();
  render(<DashboardPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar el resumen");
  expect(screen.queryByText("Total de usuarios")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("Total de usuarios")).toBeVisible();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("DASH-06 | CA-LISTS | nombres, plan, fechas de Colombia y enlaces proceden de la API", async () => {
  dashboardHttp();
  render(<DashboardPage />);
  expect(await screen.findByText("Ana Alerta")).toBeVisible();
  expect(screen.getByText("Luis Registrado")).toBeVisible();
  expect(screen.getByText("Sin membresía")).toBeVisible();
  expect(screen.getByText("Marta Pago")).toBeVisible();
  expect(screen.getByText("Anual · Transferencia")).toBeVisible();
  expect(screen.getByText(/15.*nov.*2026/)).toBeVisible();
  expect(screen.getByRole("link", { name: /Ver todas las membresías/ })).toHaveAttribute("href", "/membresias");
  expect(screen.getByRole("link", { name: /Ver usuarios/ })).toHaveAttribute("href", "/usuarios");
  expect(screen.getByRole("link", { name: /Ver pagos/ })).toHaveAttribute("href", "/pagos");
});

test("DASH-07 | CA-REFRESH | botón y evento de registros vuelven a consultar las estadísticas", async () => {
  let calls = 0;
  mockHttp(() => { const body = summary(); body.metrics.totalUsers = ++calls; return json(body); });
  const user = userEvent.setup();
  render(<DashboardPage />);
  const card = (await screen.findByText("Total de usuarios")).closest("article")!;
  expect(within(card).getByText("1")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Actualizar resumen" }));
  await waitFor(() => expect(within(card).getByText("2")).toBeVisible());
  act(() => window.dispatchEvent(new Event("fitzone:data-changed")));
  await waitFor(() => expect(within(card).getByText("3")).toBeVisible());
});

test("DASH-08 | CA-COMPARE | comparación válida y altas conocidas no se sustituyen por valores demo", async () => {
  const body = summary();
  body.comparison.percentage = "-25.50";
  body.metrics.registrationDatesAvailable = true; body.metrics.newUsersThisMonth = 4; body.metrics.usersWithoutRegistrationDate = 9;
  dashboardHttp(body);
  render(<DashboardPage />);
  expect(await screen.findByText("-25,5%")).toBeVisible();
  expect(screen.getByText("Mes en curso vs. mes anterior completo")).toBeVisible();
  expect(within(screen.getByText("Usuarios nuevos del mes").closest("article")!).getByText("4")).toBeVisible();
  expect(screen.getByText("Existen usuarios sin fecha histórica")).toBeVisible();
});

test("DASH-09 | CA-DATE | reloj usa Colombia y cambia al pasar medianoche sin recargar", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-17T04:59:59Z"));
  render(<ColombiaClock />);
  expect(screen.getByText(/lunes,? 16 de noviembre de 2026.*23:59/)).toBeVisible();
  act(() => { vi.advanceTimersByTime(1000); });
  expect(screen.getByText(/martes,? 17 de noviembre de 2026.*00:00/)).toBeVisible();
});

test("DASH-10 | CA-INVALIDATION | solo una operación administrativa exitosa invalida los datos", async () => {
  const listener = vi.fn();
  window.addEventListener("fitzone:data-changed", listener);
  try {
    mockHttp((_url, init) => json({}, init.method === "DELETE" ? 409 : 200));
    await authFetch("https://fitzone.test.invalid/api/v1/users", { method: "POST" });
    await authFetch("https://fitzone.test.invalid/api/v1/payments", { method: "POST" });
    await authFetch("https://fitzone.test.invalid/api/v1/memberships/x", { method: "PATCH" });
    await authFetch("https://fitzone.test.invalid/api/v1/users/x", { method: "DELETE" });
    await authFetch("https://fitzone.test.invalid/api/v1/dashboard");
    await authFetch("https://fitzone.test.invalid/api/v1/auth/logout", { method: "POST" });
    expect(listener).toHaveBeenCalledTimes(3);
  } finally { window.removeEventListener("fitzone:data-changed", listener); }
});

test("DASH-11 | CA-HYDRATION | servidor emite un marcador estable, sin fecha estática", () => {
  expect(renderToString(<ColombiaClock />)).toContain("Fecha y hora de Colombia");
  expect(renderToString(<ColombiaClock />)).not.toContain("<time");
});

test("DASH-12 | CA-AUTOREFRESH | consulta nuevamente al cumplirse un minuto", async () => {
  vi.useFakeTimers();
  const http = dashboardHttp();
  await act(async () => { render(<DashboardPage />); });
  const dashboardCalls = () => http.mock.calls.filter(([url]) => String(url).endsWith("/dashboard"));
  expect(dashboardCalls()).toHaveLength(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  expect(dashboardCalls()).toHaveLength(2);
});

test("DASH-13 | CA-STALE | un error posterior identifica que se conservan datos de la última consulta", async () => {
  let calls = 0;
  mockHttp(() => ++calls === 1 ? json(summary()) : json({}, 500));
  const user = userEvent.setup();
  render(<DashboardPage />);
  await screen.findByText("Total de usuarios");
  await user.click(screen.getByRole("button", { name: "Actualizar resumen" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Se conserva la última consulta");
  expect(screen.getByText("Total de usuarios")).toBeVisible();
});

test("DASH-14 | CA-NETWORK | error de conexión muestra un mensaje útil en español", async () => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/auth/session")) return json({ authenticated: true, role: "ADMIN" });
    throw new TypeError("Failed to fetch");
  }));
  render(<DashboardPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el backend. Comprueba tu conexión");
  expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
  expect(screen.queryByText("Total de usuarios")).not.toBeInTheDocument();
});
