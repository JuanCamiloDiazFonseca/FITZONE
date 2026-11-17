import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { AdminShell } from "@/components/admin-shell";
import { router } from "../support/navigation";
import { deferredResponse, json, mockHttp } from "../support/http";

test("P11-16 | CA-SESSION-01 | contenido privado permanece oculto durante verificación", async () => {
  const pending = deferredResponse();
  vi.stubGlobal("fetch", vi.fn(() => pending.promise));
  render(<AdminShell><h1>Contenido privado</h1></AdminShell>);
  expect(screen.getByRole("status")).toHaveTextContent("Verificando sesión");
  expect(screen.queryByRole("heading", { name: "Contenido privado" })).not.toBeInTheDocument();
  await act(async () => pending.resolve(json({ authenticated: true, role: "ADMIN" })));
  expect(await screen.findByRole("heading", { name: "Contenido privado" })).toBeVisible();
});

test("P11-17 | CA-SESSION-02 | sesión rechazada redirige sin revelar contenido privado", async () => {
  const replace = vi.fn();
  const originalWindow = window;
  vi.stubGlobal("window", new Proxy(originalWindow, {
    get(target, key) {
      if (key === "location") return { replace };
      return Reflect.get(target, key);
    },
  }));
  vi.stubGlobal("fetch", vi.fn(async () => json({}, 401)));
  render(<AdminShell><h1>Contenido privado</h1></AdminShell>);
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  expect(screen.queryByRole("heading", { name: "Contenido privado" })).not.toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent("La sesión ha expirado");
});

test("P11-18 | CA-SESSION-03 | botón cerrar sesión vuelve al login", async () => {
  // mockHttp handles the session check; this handler handles only logout.
  const http = mockHttp(() => json({ message: "Sesión cerrada" }));
  const user = userEvent.setup();
  render(<AdminShell><h1>Contenido privado</h1></AdminShell>);
  await user.click(await screen.findByRole("button", { name: /Cerrar sesión/ }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  expect(http).toHaveBeenCalledWith(expect.stringContaining("/auth/logout"), expect.objectContaining({ method: "POST", credentials: "include" }));
});
