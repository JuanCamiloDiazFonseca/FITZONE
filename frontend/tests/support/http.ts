import { vi } from "vitest";
import { unexpectedRequests } from "./network-guard";

export const userRecord = {
  id: "user-test-1", name: "Ana Prueba", document: "TEST-001",
  phone: "3000000000", email: "ana@example.invalid",
};
export const secondUser = { ...userRecord, id: "user-test-2", name: "Luis Ejemplo", document: "TEST-002", email: "luis@example.invalid" };
export const plan = { id: "plan-test-1", type: "MONTHLY", durationDays: 30, price: "110000" };
export const membership = {
  id: "membership-test-1", userId: userRecord.id, planId: plan.id,
  startDate: "2026-11-01T00:00:00.000Z", expirationDate: "2026-12-01T00:00:00.000Z",
  amount: "110000", status: "ACTIVE", user: userRecord, plan,
};
export const payment = {
  id: "payment-test-1", paidAt: "2026-11-16T12:00:00.000Z", amount: "110000",
  method: "CASH", user: userRecord, membership,
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export function paginated(data: unknown[]) {
  return { data, pagination: { page: 1, limit: 20, total: data.length, totalPages: data.length ? 1 : 0 } };
}

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;
export function mockHttp(handler: Handler) {
  const mock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    if (url.origin !== "https://fitzone.test.invalid") {
      unexpectedRequests.push(url.origin);
      throw new Error("Origen HTTP no permitido en pruebas");
    }
    if (url.pathname.endsWith("/auth/session")) return json({ authenticated: true, role: "ADMIN" });
    try {
      return await handler(url, init);
    } catch (error) {
      unexpectedRequests.push(`${init.method ?? "GET"} ${url.pathname}`);
      throw error;
    }
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

export function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}

export function moduleHttp(options: { users?: unknown[]; memberships?: unknown[]; payments?: unknown[] } = {}) {
  return mockHttp((url, init) => {
    if (init.method && init.method !== "GET") throw new Error("Mutación no prevista en mock de consulta");
    if (url.pathname.endsWith("/users")) return json(paginated(options.users ?? [userRecord]));
    if (url.pathname.endsWith("/memberships")) return json(paginated(options.memberships ?? [membership]));
    if (url.pathname.endsWith("/payments")) return json(paginated(options.payments ?? []));
    if (url.pathname.endsWith("/plans")) return json({ data: [plan] });
    throw new Error(`Ruta sin mock: ${url.pathname}`);
  });
}
