import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import CustomerPage from "@/app/cliente/page";
import { json } from "../support/http";

test("el portal muestra mensajes vacíos sin inventar membresías ni pagos", async () => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith("/auth/session")) return json({ authenticated: true, role: "CUSTOMER" });
    if (path.endsWith("/auth/me")) return json({ id: "c1", name: "Ana Cliente", email: "ana@example.invalid", phone: null, createdAt: null, memberships: [], payments: [] });
    if (path.endsWith("/plans")) return json({ data: [{ id: "p1", type: "MONTHLY", durationDays: 30, price: "110000" }] });
    throw new Error(`Ruta inesperada: ${path}`);
  }));
  render(<CustomerPage />);
  expect(await screen.findByRole("heading", { name: "Hola, Ana Cliente" })).toBeVisible();
  expect(screen.getByText(/Aún no tienes una membresía asignada/)).toBeVisible();
  expect(screen.getByText(/Todavía no hay pagos registrados/)).toBeVisible();
  expect(screen.getByText(/110\.000/)).toBeVisible();
});
