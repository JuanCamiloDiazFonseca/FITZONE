import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { MembershipsPage } from "@/components/memberships-page";
import { json, membership, mockHttp, moduleHttp, paginated, plan, userRecord } from "../support/http";

test("P11-10 | CA-MEM-01 | filtrar canceladas cambia el listado visible", async () => {
  const http = mockHttp((url) => {
    if (url.pathname.endsWith("/users")) return json(paginated([userRecord]));
    if (url.pathname.endsWith("/plans")) return json({ data: [plan] });
    return json(paginated(url.searchParams.get("status") === "CANCELLED" ? [] : [membership]));
  });
  const user = userEvent.setup();
  render(<MembershipsPage />);
  expect(await screen.findByRole("cell", { name: "Ana Prueba" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Canceladas" }));
  expect(await screen.findByText("No hay membresías para este filtro.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Canceladas" })).toHaveAttribute("aria-pressed", "true");
  expect(http).toHaveBeenCalledWith(expect.stringContaining("status=CANCELLED"), expect.anything());
});

test("P11-11 | CA-MEM-02 | registrar membresía confirma éxito", async () => {
  const http = mockHttp((url, init) => {
    if (url.pathname.endsWith("/users")) return json(paginated([userRecord]));
    if (url.pathname.endsWith("/plans")) return json({ data: [plan] });
    return init.method === "POST" ? json(membership, 201) : json(paginated([]));
  });
  const user = userEvent.setup();
  render(<MembershipsPage />);
  await screen.findByText("No hay membresías para este filtro.");
  await user.click(screen.getByRole("button", { name: /Nueva membresía/ }));
  const dialog = within(screen.getByRole("dialog", { name: "Nueva membresía" }));
  await user.selectOptions(dialog.getByLabelText("Usuario"), userRecord.id);
  await user.selectOptions(dialog.getByLabelText("Plan"), plan.id);
  await user.type(dialog.getByLabelText("Fecha de inicio"), "2026-11-16");
  await user.click(dialog.getByRole("button", { name: "Registrar membresía" }));
  expect(await screen.findByRole("status")).toHaveTextContent("La membresía se registró correctamente.");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(http).toHaveBeenCalledWith(expect.stringContaining("/memberships"), expect.objectContaining({ method: "POST", body: JSON.stringify({ userId: userRecord.id, planId: plan.id, startDate: "2026-11-16T00:00:00.000Z", status: "ACTIVE" }) }));
});

test("P11-12 | CA-MEM-03 | cancelar edición conserva membresía sin enviar cambios", async () => {
  const http = moduleHttp();
  const user = userEvent.setup();
  render(<MembershipsPage />);
  await user.click(await screen.findByRole("button", { name: "Editar membresía de Ana Prueba" }));
  expect(screen.getByRole("dialog", { name: "Editar membresía" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Ana Prueba" })).toBeVisible();
  expect(http.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(false);
});
