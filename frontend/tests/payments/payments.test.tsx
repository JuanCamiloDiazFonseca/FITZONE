import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { PaymentsPage } from "@/components/payments-page";
import { json, membership, mockHttp, moduleHttp, paginated, payment, userRecord } from "../support/http";

test("P11-13 | CA-PAY-01 | historial muestra usuario y método del pago", async () => {
  moduleHttp({ payments: [payment] });
  render(<PaymentsPage />);
  expect(await screen.findByRole("cell", { name: "Ana Prueba" })).toBeVisible();
  expect(screen.getByRole("cell", { name: "Efectivo" })).toBeVisible();
});

test("P11-14 | CA-PAY-02 | sin usuario no permite registrar un pago", async () => {
  const http = moduleHttp();
  const user = userEvent.setup();
  render(<PaymentsPage />);
  await screen.findByRole("heading", { name: "Pagos" });
  await user.click(screen.getByRole("button", { name: /Nuevo pago/ }));
  const dialog = within(screen.getByRole("dialog", { name: "Registrar pago" }));
  expect(dialog.getByLabelText("Membresía")).toBeDisabled();
  expect(dialog.getByRole("button", { name: "Registrar pago" })).toBeDisabled();
  await user.click(dialog.getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(http.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
});

test("P11-15 | CA-PAY-03 | registrar pago envía selección y muestra éxito", async () => {
  const http = mockHttp((url, init) => {
    if (url.pathname.endsWith("/users")) return json(paginated([userRecord]));
    if (url.pathname.endsWith("/memberships")) return json(paginated([membership]));
    return init.method === "POST" ? json(payment, 201) : json(paginated([]));
  });
  const user = userEvent.setup();
  render(<PaymentsPage />);
  await user.click(await screen.findByRole("button", { name: /Nuevo pago/ }));
  const dialog = within(screen.getByRole("dialog", { name: "Registrar pago" }));
  await dialog.findByRole("option", { name: "Ana Prueba" });
  await user.selectOptions(dialog.getByLabelText("Usuario"), userRecord.id);
  await dialog.findByRole("option", { name: /Mensual.*inicio/ });
  await user.selectOptions(dialog.getByLabelText("Membresía"), membership.id);
  await user.type(dialog.getByLabelText("Importe (COP)"), "110000");
  await user.selectOptions(dialog.getByLabelText("Método de pago"), "CASH");
  await user.click(dialog.getByRole("button", { name: "Registrar pago" }));
  expect(await screen.findByRole("status")).toHaveTextContent("El pago se registró correctamente.");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(http).toHaveBeenCalledWith(expect.stringContaining("/payments"), expect.objectContaining({ method: "POST", body: expect.stringContaining('"membershipId":"membership-test-1"') }));
});
