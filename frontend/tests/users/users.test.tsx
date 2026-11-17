import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { UsersPage } from "@/components/users-page";
import { deferredResponse, json, mockHttp, moduleHttp, paginated, secondUser, userRecord } from "../support/http";

test("P11-05 | CA-USR-01 | listado muestra carga antes de recibir datos", async () => {
  const pending = deferredResponse();
  mockHttp(() => pending.promise);
  render(<UsersPage />);
  expect(await screen.findByText("Cargando usuarios…")).toBeVisible();
  await act(async () => pending.resolve(json(paginated([userRecord]))));
  expect(await screen.findByText("Ana Prueba")).toBeVisible();
  expect(screen.queryByText("Cargando usuarios…")).not.toBeInTheDocument();
});

test("P11-06 | CA-USR-02 | listado vacío informa ausencia de usuarios", async () => {
  moduleHttp({ users: [] });
  render(<UsersPage />);
  expect(await screen.findByText("Todavía no hay usuarios registrados.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
});

test("P11-07 | CA-USR-03 | búsqueda filtra y permite recuperar el listado", async () => {
  moduleHttp({ users: [userRecord, secondUser] });
  const user = userEvent.setup();
  render(<UsersPage />);
  expect(await screen.findByText("Ana Prueba")).toBeVisible();
  await user.type(screen.getByRole("textbox", { name: "Buscar usuarios en esta página" }), "luis");
  expect(screen.getByText("Luis Ejemplo")).toBeVisible();
  expect(screen.queryByText("Ana Prueba")).not.toBeInTheDocument();
  await user.clear(screen.getByRole("textbox", { name: "Buscar usuarios en esta página" }));
  expect(screen.getByText("Ana Prueba")).toBeVisible();
});

test("P11-08 | CA-USR-04 | error de API se comunica sin mostrar datos", async () => {
  mockHttp(() => json({ message: "Error simulado" }, 500));
  render(<UsersPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("El servidor no pudo completar la solicitud.");
  expect(screen.queryByText("Ana Prueba")).not.toBeInTheDocument();
});

test("P11-09 | CA-USR-05 | registrar usuario muestra éxito y actualiza la tabla", async () => {
  const http = mockHttp((_url, init) => init.method === "POST" ? json(userRecord, 201) : json(paginated([])));
  const user = userEvent.setup();
  render(<UsersPage />);
  await screen.findByText("Todavía no hay usuarios registrados.");
  await user.click(screen.getByRole("button", { name: /Nuevo usuario/ }));
  const dialog = within(screen.getByRole("dialog", { name: "Registrar usuario" }));
  await user.type(dialog.getByLabelText("Nombre completo"), userRecord.name);
  await user.type(dialog.getByLabelText("Documento"), userRecord.document);
  await user.type(dialog.getByLabelText("Teléfono"), userRecord.phone);
  await user.type(dialog.getByLabelText("Correo electrónico"), userRecord.email);
  await user.click(dialog.getByRole("button", { name: "Registrar usuario" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Usuario registrado correctamente.");
  expect(await screen.findByText(userRecord.name)).toBeVisible();
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(http).toHaveBeenCalledWith(expect.stringContaining("/users"), expect.objectContaining({ method: "POST", body: JSON.stringify({ name: userRecord.name, document: userRecord.document, phone: userRecord.phone, email: userRecord.email }) }));
});
