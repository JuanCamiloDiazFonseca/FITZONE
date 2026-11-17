import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import LoginPage from "@/app/login/page";
import { router } from "../support/navigation";
import { deferredResponse, json, mockHttp } from "../support/http";

test("P11-01 | CA-AUTH-01 | login válido navega al dashboard", async () => {
  const http = mockHttp(() => json({ message: "Inicio correcto" }, 201));
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.type(screen.getByLabelText("Correo electrónico"), "admin@example.invalid");
  await user.type(screen.getByLabelText("Contraseña"), "clave-sintetica-test");
  await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
  expect(http).toHaveBeenCalledWith(expect.stringContaining("/auth/login"), expect.objectContaining({ method: "POST", credentials: "include" }));
  expect(router.refresh).toHaveBeenCalledOnce();
});

test("P11-02 | CA-AUTH-02 | credenciales rechazadas muestran una alerta", async () => {
  mockHttp(() => json({ message: "Unauthorized" }, 401));
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.type(screen.getByLabelText("Correo electrónico"), "admin@example.invalid");
  await user.type(screen.getByLabelText("Contraseña"), "clave-sintetica-test");
  await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contraseña incorrectos.");
  expect(router.replace).not.toHaveBeenCalled();
});

test("P11-03 | CA-FORM-01 | formulario vacío bloquea el envío", async () => {
  const http = mockHttp(() => json({}));
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
  expect(screen.getByLabelText("Correo electrónico")).toBeInvalid();
  expect(screen.getByLabelText("Contraseña")).toBeInvalid();
  expect(http).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

test("P11-04 | CA-AUTH-03 | login pendiente deshabilita el envío repetido", async () => {
  const pending = deferredResponse();
  mockHttp(() => pending.promise);
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.type(screen.getByLabelText("Correo electrónico"), "admin@example.invalid");
  await user.type(screen.getByLabelText("Contraseña"), "clave-sintetica-test");
  await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
  expect(screen.getByRole("button", { name: /Validando/ })).toBeDisabled();
  expect(screen.getByLabelText("Correo electrónico")).toBeDisabled();
  await act(async () => pending.resolve(json({}, 201)));
  await waitFor(() => expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeEnabled());
});
