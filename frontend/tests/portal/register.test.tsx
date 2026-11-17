import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import RegisterPage from "@/app/registro/page";
import { router } from "../support/navigation";
import { json, mockHttp } from "../support/http";

test("el registro valida la confirmacion antes de enviar datos", async () => {
  const http = mockHttp(() => json({ id: "client-1" }, 201));
  const user = userEvent.setup();
  render(<RegisterPage />);
  await user.type(screen.getByLabelText("Nombre completo"), "Cliente Prueba");
  await user.type(screen.getByLabelText("Correo electrónico"), "cliente@example.invalid");
  await user.type(screen.getByLabelText("Contraseña"), "clave-sintetica-123");
  await user.type(screen.getByLabelText("Confirmar contraseña"), "otra-clave-123");
  await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("no coinciden");
  expect(http).not.toHaveBeenCalled();
});

test("el registro crea la cuenta e inicia sesión como cliente", async () => {
  const http = mockHttp((url) => url.pathname.endsWith("/auth/register") ? json({ id: "client-1" }, 201) : json({ role: "CUSTOMER" }, 201));
  const user = userEvent.setup();
  render(<RegisterPage />);
  await user.type(screen.getByLabelText("Nombre completo"), "Cliente Prueba");
  await user.type(screen.getByLabelText("Correo electrónico"), "cliente@example.invalid");
  await user.type(screen.getByLabelText("Contraseña"), "clave-sintetica-123");
  await user.type(screen.getByLabelText("Confirmar contraseña"), "clave-sintetica-123");
  await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/cliente"));
  expect(http).toHaveBeenCalledTimes(2);
  expect(http.mock.calls[0][1]?.body).toContain('"name":"Cliente Prueba"');
});
