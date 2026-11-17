"use client";

import { startTransition, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { AdminShell } from "@/components/admin-shell";
import { Icon } from "@/components/icon";
import { PageHeading, Panel, TableHead, TableWrap } from "@/components/ui";

type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "OTHER";
type PlanType = "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL";

type UserRecord = { id: string; name: string };
type MembershipRecord = {
  id: string;
  user: { id: string; name: string };
  startDate: string;
  expirationDate: string;
  plan: { type: PlanType; durationDays: number };
};
type PaymentRecord = {
  id: string;
  paidAt: string;
  amount: string | number;
  method: PaymentMethod;
  user: { id: string; name: string };
  membership: {
    id: string;
    startDate: string;
    expirationDate: string;
    plan: { type: PlanType; durationDays: number };
  };
};
type PaginatedResponse<T> = {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
const PAGE_SIZE = 20;
const OPTION_PAGE_SIZE = 100;
const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  BANK_TRANSFER: "Transferencia bancaria",
  OTHER: "Otro",
};
const PLAN_LABELS: Record<PlanType, string> = {
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
};

function isPaymentsResponse(value: unknown): value is PaginatedResponse<PaymentRecord> {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<PaginatedResponse<PaymentRecord>>;
  const pagination = result.pagination;
  return Array.isArray(result.data)
    && Boolean(pagination)
    && Number.isInteger(pagination?.page)
    && Number.isInteger(pagination?.limit)
    && Number.isInteger(pagination?.total)
    && Number.isInteger(pagination?.totalPages);
}

async function readErrorMessage(response: Response): Promise<string> {
  if (response.status >= 500) {
    return "El servidor no pudo completar la solicitud. Inténtalo de nuevo.";
  }
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(" ");
    if (body.message) return body.message;
  } catch {
    // Keep a clear fallback when the server response is not JSON.
  }
  return "No se pudo completar la solicitud. Revisa los datos e inténtalo de nuevo.";
}

function requestError(error: unknown, fallback: string): string {
  if (error instanceof TypeError) {
    return "No se pudo conectar con NestJS. Verifica que el backend esté activo y que CORS permita el frontend.";
  }
  return error instanceof Error ? error.message : fallback;
}

async function fetchAllPages<T>(
  resource: string,
  signal: AbortSignal,
): Promise<T[]> {
  if (!API_BASE_URL) throw new Error("Falta configurar NEXT_PUBLIC_API_BASE_URL en el frontend.");

  const getPage = async (page: number) => {
    const response = await authFetch(
      `${API_BASE_URL}/${resource}?page=${page}&limit=${OPTION_PAGE_SIZE}`,
      { headers: { Accept: "application/json" }, cache: "no-store", credentials: "include", signal },
    );
    if (!response.ok) throw new Error(await readErrorMessage(response));
    return (await response.json()) as PaginatedResponse<T>;
  };

  const first = await getPage(1);
  if (first.pagination.totalPages <= 1) return first.data;
  const remaining = await Promise.all(
    Array.from({ length: first.pagination.totalPages - 1 }, (_, index) => getPage(index + 2)),
  );
  return [first, ...remaining].flatMap((page) => page.data);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatCop(value: string | number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<PaymentRecord>["pagination"]>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedMembershipId, setSelectedMembershipId] = useState("");
  const [defaultPaidAt, setDefaultPaidAt] = useState("");

  const loadPayments = useCallback(async (page: number) => {
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15_000);

    try {
      if (!API_BASE_URL) {
        throw new Error("Falta configurar NEXT_PUBLIC_API_BASE_URL en el frontend.");
      }
      const response = await authFetch(
        `${API_BASE_URL}/payments?page=${page}&limit=${PAGE_SIZE}`,
        { headers: { Accept: "application/json" }, cache: "no-store", credentials: "include", signal: controller.signal },
      );
      if (!response.ok) throw new Error(await readErrorMessage(response));
      const payload: unknown = await response.json();
      if (!isPaymentsResponse(payload)) {
        throw new Error("El backend devolvió una respuesta de pagos con formato inválido.");
      }
      const result = payload;
      setPayments(result.data);
      setPagination(result.pagination);
    } catch (loadError) {
      setError(controller.signal.aborted
        ? "La consulta de pagos tardó demasiado. Verifica que NestJS responda y vuelve a intentarlo."
        : requestError(loadError, "No se pudieron cargar los pagos."));
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => { void loadPayments(1); });
  }, [loadPayments]);

  useEffect(() => {
    if (!formOpen) return;
    const controller = new AbortController();
    void fetchAllPages<UserRecord>("users", controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setUsers(result);
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setOptionsError(requestError(loadError, "No se pudieron cargar los usuarios."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setUsersLoading(false);
      });
    return () => controller.abort();
  }, [formOpen]);

  useEffect(() => {
    if (!formOpen || !selectedUserId) return;

    const controller = new AbortController();
    void fetchAllPages<MembershipRecord>("memberships", controller.signal)
      .then((allMemberships) => {
        if (!controller.signal.aborted) {
          setMemberships(allMemberships.filter((membership) => membership.user.id === selectedUserId));
        }
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setOptionsError(requestError(loadError, "No se pudieron cargar las membresías."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setMembershipsLoading(false);
      });
    return () => controller.abort();
  }, [formOpen, selectedUserId]);

  function openForm() {
    const now = new Date();
    setDefaultPaidAt(new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16));
    setUsersLoading(true);
    setMemberships([]);
    setMembershipsLoading(false);
    setSelectedUserId("");
    setSelectedMembershipId("");
    setOptionsError("");
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  function closeForm() {
    if (submitting) return;
    setFormOpen(false);
    setSelectedUserId("");
    setSelectedMembershipId("");
    setError("");
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!API_BASE_URL) {
      setError("Falta configurar NEXT_PUBLIC_API_BASE_URL en el frontend.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const userId = String(formData.get("userId") ?? "");
    const membershipId = String(formData.get("membershipId") ?? "");
    const paidAtInput = String(formData.get("paidAt") ?? "");
    const amountInput = String(formData.get("amount") ?? "").trim();
    const method = String(formData.get("method") ?? "") as PaymentMethod;
    const numericAmount = Number(amountInput);
    const paidAt = new Date(paidAtInput);

    if (!userId || !membershipId || !paidAtInput || !amountInput || !method) {
      setError("Completa todos los campos para registrar el pago.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 99_999_999.99 || !/^\d+(\.\d{1,2})?$/.test(amountInput)) {
      setError("El importe debe ser mayor que cero y tener máximo dos decimales.");
      return;
    }
    if (Number.isNaN(paidAt.getTime())) {
      setError("Ingresa una fecha de pago válida.");
      return;
    }
    if (!users.some((user) => user.id === userId) || !memberships.some((membership) => membership.id === membershipId)) {
      setError("Selecciona un usuario y una membresía disponibles.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const response = await authFetch(`${API_BASE_URL}/payments`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          membershipId,
          paidAt: paidAt.toISOString(),
          amount: numericAmount,
          method,
        }),
      });
      if (!response.ok) throw new Error(await readErrorMessage(response));

      setFormOpen(false);
      setSelectedUserId("");
      setSelectedMembershipId("");
      setSuccess("El pago se registró correctamente.");
      await loadPayments(1);
    } catch (submitError) {
      setError(requestError(submitError, "No se pudo registrar el pago."));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <AdminShell>
      <PageHeading
        eyebrow="Administración · Finanzas"
        title="Pagos"
        description="Consulta el historial real y registra pagos asociados a membresías."
        action={(
          <button type="button" onClick={openForm} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#b4f344] px-4 text-xs font-bold text-[#141a0e] shadow-[0_5px_20px_rgba(180,243,68,0.1)] transition hover:bg-[#c1fa5b]">
            <Icon name="plus" size={15} />Nuevo pago
          </button>
        )}
      />

      {success && <p role="status" className="mb-5 rounded-xl border border-[#b4f344]/15 bg-[#b4f344]/[0.06] px-4 py-3 text-xs text-[#b4f344]">{success}</p>}
      {error && !formOpen && <p role="alert" className="mb-5 rounded-xl border border-[#f08b84]/20 bg-[#f08b84]/[0.06] px-4 py-3 text-xs leading-5 text-[#f2a19b]">{error}</p>}

      <Panel title="Historial de pagos" subtitle="Registros recibidos desde el backend FITZONE" action={<span className="text-[10px] text-[#768078]">{pagination.total.toLocaleString("es-CO")} registros</span>}>
        <TableWrap minWidth="1050px">
          <TableHead columns={["Usuario", "Membresía", "Plan", "Inicio", "Vencimiento", "Fecha de pago", "Importe", "Método"]} />
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-6 py-12 text-center text-xs text-[#89928b]">Cargando pagos…</td></tr>
            ) : payments.length ? payments.map((payment) => (
              <tr key={payment.id} className="border-b border-white/[0.04] last:border-0 transition hover:bg-white/[0.018]">
                <td className="whitespace-nowrap px-5 py-4 text-[10px] font-semibold text-[#dce2dd] sm:px-6">{payment.user.name}</td>
                <td className="whitespace-nowrap px-5 py-4 text-[10px] text-[#a3aca5] sm:px-6">{payment.membership.id.slice(0, 8).toUpperCase()}</td>
                <td className="whitespace-nowrap px-5 py-4 text-[10px] text-[#a3aca5] sm:px-6">{PLAN_LABELS[payment.membership.plan.type]}</td>
                <td className="whitespace-nowrap px-5 py-4 text-[10px] text-[#89928b] sm:px-6">{formatDate(payment.membership.startDate)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-[10px] text-[#89928b] sm:px-6">{formatDate(payment.membership.expirationDate)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-[10px] text-[#89928b] sm:px-6">{formatDateTime(payment.paidAt)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-[10px] font-bold text-[#dbe2dc] sm:px-6">{formatCop(payment.amount)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-[10px] text-[#89928b] sm:px-6">{METHOD_LABELS[payment.method]}</td>
              </tr>
            )) : (
              <tr><td colSpan={8} className="px-6 py-12 text-center text-xs text-[#89928b]">{error ? "No se pudieron mostrar los pagos." : "No hay pagos registrados."}</td></tr>
            )}
          </tbody>
        </TableWrap>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.055] px-5 py-4 sm:flex-row sm:px-6">
          <span className="text-[10px] text-[#727c74]">{loading ? "Consultando el backend…" : `Página ${pagination.page} de ${Math.max(pagination.totalPages, 1)} · ${pagination.total} pagos`}</span>
          <div className="flex gap-2">
            <button type="button" disabled={loading || pagination.page <= 1} onClick={() => void loadPayments(pagination.page - 1)} className="h-8 rounded-lg border border-white/[0.08] px-3 text-[10px] text-[#aeb7b0] transition enabled:hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
            <button type="button" disabled={loading || pagination.page >= pagination.totalPages} onClick={() => void loadPayments(pagination.page + 1)} className="h-8 rounded-lg border border-white/[0.08] px-3 text-[10px] text-[#aeb7b0] transition enabled:hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </Panel>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="payment-form-title" className="my-auto w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#111412] shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.055] px-5 py-5 sm:px-6">
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#9cbc6c]">Administración · Finanzas</p>
                <h2 id="payment-form-title" className="text-lg font-bold text-[#f0f4f0]">Registrar pago</h2>
                <p className="mt-1 text-[11px] text-[#818b83]">El pago quedará vinculado al usuario y a su membresía.</p>
              </div>
              <button type="button" aria-label="Cerrar formulario" disabled={submitting} onClick={closeForm} className="rounded-lg p-2 text-[#929b94] transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"><Icon name="x" size={17} /></button>
            </div>

            <form onSubmit={submitPayment} className="space-y-4 px-5 py-5 sm:px-6">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold text-[#aeb7b0]">Usuario</span>
                <select name="userId" required value={selectedUserId} onChange={(event) => { setSelectedUserId(event.target.value); setSelectedMembershipId(""); setMemberships([]); setMembershipsLoading(Boolean(event.target.value)); setOptionsError(""); }} disabled={usersLoading || submitting || users.length === 0} className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0d0c] px-3 text-xs text-white outline-none focus:border-[#b4f344]/40 disabled:opacity-50">
                  <option value="">{usersLoading ? "Cargando usuarios…" : users.length ? "Selecciona un usuario" : "No hay usuarios disponibles"}</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold text-[#aeb7b0]">Membresía</span>
                <select name="membershipId" required value={selectedMembershipId} onChange={(event) => setSelectedMembershipId(event.target.value)} disabled={!selectedUserId || membershipsLoading || submitting || memberships.length === 0} className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0d0c] px-3 text-xs text-white outline-none focus:border-[#b4f344]/40 disabled:opacity-50">
                  <option value="">{!selectedUserId ? "Selecciona primero un usuario" : membershipsLoading ? "Cargando membresías…" : memberships.length ? "Selecciona una membresía" : "El usuario no tiene membresías"}</option>
                  {memberships.map((membership) => <option key={membership.id} value={membership.id}>{PLAN_LABELS[membership.plan.type]} · inicio {formatDate(membership.startDate)} · vence {formatDate(membership.expirationDate)}</option>)}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold text-[#aeb7b0]">Fecha del pago</span>
                  <input name="paidAt" type="datetime-local" required defaultValue={defaultPaidAt} disabled={submitting} className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0d0c] px-3 text-xs text-white outline-none focus:border-[#b4f344]/40 disabled:opacity-50" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold text-[#aeb7b0]">Importe (COP)</span>
                  <input name="amount" type="number" min="0.01" max="99999999.99" step="0.01" inputMode="decimal" required disabled={submitting} placeholder="Ej. 110000" className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0d0c] px-3 text-xs text-white outline-none placeholder:text-[#687169] focus:border-[#b4f344]/40 disabled:opacity-50" />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold text-[#aeb7b0]">Método de pago</span>
                <select name="method" required defaultValue="" disabled={submitting} className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0d0c] px-3 text-xs text-white outline-none focus:border-[#b4f344]/40 disabled:opacity-50">
                  <option value="" disabled>Selecciona un método</option>
                  {(Object.entries(METHOD_LABELS) as [PaymentMethod, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>

              {optionsError && <div role="alert" className="rounded-xl border border-[#f08b84]/20 bg-[#f08b84]/[0.06] px-3 py-2.5 text-[10px] leading-5 text-[#f2a19b]">{optionsError}</div>}
              {error && <p role="alert" className="rounded-xl border border-[#f08b84]/20 bg-[#f08b84]/[0.06] px-3 py-2.5 text-[10px] leading-5 text-[#f2a19b]">{error}</p>}
              <div className="flex justify-end gap-2 border-t border-white/[0.055] pt-4">
                <button type="button" disabled={submitting} onClick={closeForm} className="h-10 rounded-xl border border-white/[0.09] px-4 text-xs font-semibold text-[#c4ccc5] transition hover:bg-white/[0.05] disabled:opacity-40">Cancelar</button>
                <button type="submit" disabled={submitting || usersLoading || membershipsLoading || Boolean(optionsError) || users.length === 0 || !selectedUserId || memberships.length === 0} className="inline-flex h-10 min-w-36 items-center justify-center rounded-xl bg-[#b4f344] px-4 text-xs font-bold text-[#141a0e] transition hover:bg-[#c1fa5b] disabled:cursor-wait disabled:opacity-60">
                  {submitting ? "Registrando…" : "Registrar pago"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
