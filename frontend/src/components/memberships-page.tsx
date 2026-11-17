"use client";

import { startTransition, useCallback, useEffect, useState, type FormEvent } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { AdminShell } from "@/components/admin-shell";
import { Icon } from "@/components/icon";
import { PageHeading, Panel, StatCard, TableHead, TableWrap } from "@/components/ui";

type MembershipStatus = "ACTIVE" | "UPCOMING" | "EXPIRED" | "CANCELLED";
type StoredMembershipStatus = "ACTIVE" | "CANCELLED";
type MembershipFilter = "ALL" | MembershipStatus;
type PlanType = "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL";

type UserRecord = { id: string; name: string };
type PlanRecord = {
  id: string;
  type: PlanType;
  durationDays: number;
  price: string | number;
};
type MembershipRecord = {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  expirationDate: string;
  amount: string | number;
  status: MembershipStatus;
  user: UserRecord;
  plan: PlanRecord;
};
type MembershipsResponse = {
  data: MembershipRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
type UsersResponse = {
  data: UserRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
type PlansResponse = { data: PlanRecord[] };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
const PAGE_SIZE = 20;
const USER_PAGE_SIZE = 100;
const FILTERS: { value: MembershipFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "ACTIVE", label: "Activas" },
  { value: "UPCOMING", label: "Por vencer" },
  { value: "EXPIRED", label: "Vencidas" },
  { value: "CANCELLED", label: "Canceladas" },
];
const PLAN_LABELS: Record<PlanType, string> = {
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
};
const STATUS_LABELS: Record<MembershipStatus, string> = {
  ACTIVE: "Activa",
  UPCOMING: "Próxima a vencer",
  EXPIRED: "Vencida",
  CANCELLED: "Cancelada",
};
const STATUS_STYLES: Record<MembershipStatus, string> = {
  ACTIVE: "border-[#b4f344]/15 bg-[#b4f344]/[0.08] text-[#b4f344]",
  UPCOMING: "border-[#e3b65b]/15 bg-[#e3b65b]/[0.08] text-[#e3b65b]",
  EXPIRED: "border-[#ed817b]/15 bg-[#ed817b]/[0.08] text-[#ed817b]",
  CANCELLED: "border-white/[0.1] bg-white/[0.04] text-[#aeb7b0]",
};

async function fetchMembershipsForSearch(
  status: MembershipFilter,
  signal: AbortSignal,
): Promise<MembershipRecord[]> {
  if (!API_BASE_URL) throw new Error("Falta configurar NEXT_PUBLIC_API_BASE_URL en el frontend.");

  const getPage = async (page: number): Promise<MembershipsResponse> => {
    const statusQuery = status === "ALL" ? "" : `&status=${status}`;
    const response = await authFetch(
      `${API_BASE_URL}/memberships?page=${page}&limit=100${statusQuery}`,
      { headers: { Accept: "application/json" }, cache: "no-store", credentials: "include", signal },
    );
    if (!response.ok) throw new Error(await readErrorMessage(response));
    return (await response.json()) as MembershipsResponse;
  };

  const firstPage = await getPage(1);
  if (firstPage.pagination.totalPages <= 1) return firstPage.data;
  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.pagination.totalPages - 1 }, (_, index) => getPage(index + 2)),
  );
  return [firstPage, ...remainingPages].flatMap((result) => result.data);
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
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function toUtcStartOfDay(dateValue: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return date.toISOString();
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
    // Use a generic message when the server response is not JSON.
  }

  return "No se pudo completar la solicitud. Revisa los datos e inténtalo de nuevo.";
}

function getRequestError(error: unknown, fallback: string): string {
  if (error instanceof TypeError) {
    return "No se pudo conectar con NestJS. Verifica que el backend esté activo y que CORS permita el frontend.";
  }
  return error instanceof Error ? error.message : fallback;
}

export function MembershipsPage() {
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const [pagination, setPagination] = useState<MembershipsResponse["pagination"]>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [filter, setFilter] = useState<MembershipFilter>("ALL");
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [usersError, setUsersError] = useState("");
  const [plansError, setPlansError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<MembershipRecord | null>(null);
  const [search, setSearch] = useState("");
  const [searchMatches, setSearchMatches] = useState<MembershipRecord[] | null>(null);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const formOptionsError = editingMembership ? plansError : [usersError, plansError].filter(Boolean).join(" ");

  const loadMemberships = useCallback(async (page: number, status: MembershipFilter) => {
    if (!API_BASE_URL) {
      setError("Falta configurar NEXT_PUBLIC_API_BASE_URL en el frontend.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    const statusQuery = status === "ALL" ? "" : `&status=${status}`;

    try {
      const response = await authFetch(
        `${API_BASE_URL}/memberships?page=${page}&limit=${PAGE_SIZE}${statusQuery}`,
        { headers: { Accept: "application/json" }, cache: "no-store", credentials: "include" },
      );
      if (!response.ok) throw new Error(await readErrorMessage(response));

      const result = (await response.json()) as MembershipsResponse;
      setMemberships(result.data);
      setPagination(result.pagination);
    } catch (requestError) {
      setError(getRequestError(requestError, "No se pudieron cargar las membresías."));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async (page: number) => {
    if (!API_BASE_URL) {
      setUsersError("Falta configurar NEXT_PUBLIC_API_BASE_URL en el frontend.");
      return;
    }

    setUsersLoading(true);
    setUsersError("");
    try {
      const response = await authFetch(
        `${API_BASE_URL}/users?page=${page}&limit=${USER_PAGE_SIZE}`,
        { headers: { Accept: "application/json" }, cache: "no-store", credentials: "include" },
      );
      if (!response.ok) throw new Error(await readErrorMessage(response));

      const result = (await response.json()) as UsersResponse;
      setUsers(result.data);
      setUsersPage(result.pagination.page);
      setUsersTotalPages(result.pagination.totalPages);
    } catch (requestError) {
      setUsersError(getRequestError(requestError, "No se pudieron cargar los usuarios."));
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadPlans = useCallback(async () => {
    if (!API_BASE_URL) {
      setPlansError("Falta configurar NEXT_PUBLIC_API_BASE_URL en el frontend.");
      return;
    }

    setPlansLoading(true);
    setPlansError("");
    try {
      const response = await authFetch(`${API_BASE_URL}/plans`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) throw new Error(await readErrorMessage(response));

      const result = (await response.json()) as PlansResponse;
      setPlans(result.data);
    } catch (requestError) {
      setPlansError(getRequestError(requestError, "No se pudieron cargar los planes."));
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadMemberships(1, "ALL");
      void loadUsers(1);
      void loadPlans();
    });
  }, [loadMemberships, loadPlans, loadUsers]);

  useEffect(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) {
      startTransition(() => {
        setSearchMatches(null);
        setSearchPage(1);
        setSearchLoading(false);
      });
      return;
    }

    const controller = new AbortController();
    startTransition(() => {
      setSearchLoading(true);
      setError("");
    });
    const debounceId = window.setTimeout(() => {
      void fetchMembershipsForSearch(filter, controller.signal)
        .then((allMemberships) => {
          if (controller.signal.aborted) return;
          setSearchMatches(allMemberships.filter((membership) =>
            [membership.user.name, PLAN_LABELS[membership.plan.type], membership.plan.type]
              .some((value) => value.toLocaleLowerCase().includes(term)),
          ));
          setSearchPage(1);
        })
        .catch((searchError: unknown) => {
          if (!controller.signal.aborted) {
            setSearchMatches([]);
            setSearchPage(1);
            setError(getRequestError(searchError, "No se pudieron buscar las membresías."));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchLoading(false);
        });
    }, 200);

    return () => {
      window.clearTimeout(debounceId);
      controller.abort();
    };
  }, [filter, search]);

  const isSearching = Boolean(search.trim());
  const filteredTotal = isSearching ? searchMatches?.length ?? 0 : pagination.total;
  const filteredTotalPages = isSearching
    ? Math.ceil(filteredTotal / PAGE_SIZE)
    : pagination.totalPages;
  const currentPage = isSearching ? searchPage : pagination.page;
  const visibleMemberships = isSearching
    ? (searchMatches ?? []).slice((searchPage - 1) * PAGE_SIZE, searchPage * PAGE_SIZE)
    : memberships;
  const listLoading = loading || searchLoading;

  function openCreateForm() {
    setEditingMembership(null);
    setSelectedUserId("");
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  function openEditForm(membership: MembershipRecord) {
    setEditingMembership(membership);
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  async function submitMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!API_BASE_URL) {
      setError("Falta configurar NEXT_PUBLIC_API_BASE_URL en el frontend.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const planId = String(formData.get("planId") ?? "");
    const startDate = String(formData.get("startDate") ?? "");
    const startDateIso = toUtcStartOfDay(startDate);
    const selectedStatus = String(formData.get("status") ?? "ACTIVE") as StoredMembershipStatus;

    if (!editingMembership && !selectedUserId) {
      setError("Selecciona un usuario existente.");
      return;
    }
    if (!planId || !startDate || !startDateIso) {
      setError("Selecciona un plan y una fecha de inicio.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      let response: Response;
      if (editingMembership) {
        const patch: { planId?: string; startDate?: string; status?: StoredMembershipStatus } = {};
        if (planId !== editingMembership.planId) patch.planId = planId;
        if (startDate !== editingMembership.startDate.slice(0, 10)) patch.startDate = startDateIso;
        const existingStoredStatus = editingMembership.status === "CANCELLED" ? "CANCELLED" : "ACTIVE";
        if (selectedStatus !== existingStoredStatus) patch.status = selectedStatus;

        if (Object.keys(patch).length === 0) {
          setError("No hay cambios para guardar.");
          setSubmitting(false);
          return;
        }

        response = await authFetch(`${API_BASE_URL}/memberships/${encodeURIComponent(editingMembership.id)}`, {
          method: "PATCH",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(patch),
        });
      } else {
        response = await authFetch(`${API_BASE_URL}/memberships`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId: selectedUserId, planId, startDate: startDateIso, status: selectedStatus }),
        });
      }

      if (!response.ok) throw new Error(await readErrorMessage(response));

      const wasEditing = Boolean(editingMembership);
      const nextFilter = wasEditing ? filter : selectedStatus;
      setFormOpen(false);
      setEditingMembership(null);
      setSearch("");
      setFilter(nextFilter);
      setSuccess(wasEditing ? "La membresía se actualizó correctamente." : "La membresía se registró correctamente.");
      form.reset();
      await loadMemberships(1, nextFilter);
    } catch (requestError) {
      setError(getRequestError(requestError, "No se pudo guardar la membresía."));
    } finally {
      setSubmitting(false);
    }
  }

  const formStoredStatus: StoredMembershipStatus = editingMembership?.status === "CANCELLED"
    ? "CANCELLED"
    : "ACTIVE";

  return (
    <AdminShell>
      <PageHeading
        eyebrow="Administración · Planes"
        title="Membresías"
        description="Consulta y administra las membresías registradas en FITZONE."
        action={
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#b4f344] px-4 text-xs font-bold text-[#141a0e] shadow-[0_5px_20px_rgba(180,243,68,0.1)] transition hover:bg-[#c1fa5b]"
          >
            <Icon name="plus" size={15} />Nueva membresía
          </button>
        }
      />

      {success && <p role="status" className="mb-5 rounded-xl border border-[#b4f344]/15 bg-[#b4f344]/[0.06] px-4 py-3 text-xs text-[#b4f344]">{success}</p>}
      {error && !formOpen && <p role="alert" className="mb-5 rounded-xl border border-[#f08b84]/20 bg-[#f08b84]/[0.06] px-4 py-3 text-xs leading-5 text-[#f2a19b]">{error}</p>}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Resultados" value={listLoading ? "…" : filteredTotal.toLocaleString("es-CO")} change={isSearching ? "Coincidencias" : "Filtro actual"} icon="card" note="datos del backend" />
        <StatCard label="En esta página" value={listLoading ? "…" : visibleMemberships.length.toLocaleString("es-CO")} change="Registros" trend="neutral" icon="users" note="listado real" />
        <StatCard label="Planes disponibles" value={plansLoading ? "…" : plans.length.toLocaleString("es-CO")} change="Catálogo" trend="neutral" icon="calendar" note="datos del backend" />
      </div>

      {plans.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan, index) => {
            const accents = ["#b4f344", "#67d7a3", "#82aaff", "#c49bff"];
            return (
              <article key={plan.id} className="rounded-2xl border border-white/[0.065] bg-[#111412] p-5 transition hover:border-white/[0.12]">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white/[0.02]" style={{ color: accents[index % accents.length], borderColor: `${accents[index % accents.length]}22` }}><Icon name="card" size={17} /></span>
                  <span className="rounded-full border border-[#b4f344]/15 bg-[#b4f344]/[0.07] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#b4f344]">Disponible</span>
                </div>
                <h2 className="mt-5 text-[14px] font-bold text-[#e6ebe7]">Plan {PLAN_LABELS[plan.type]}</h2>
                <p className="mt-1 text-[10px] text-[#7c867e]">Duración: {plan.durationDays} días</p>
                <p className="mt-5 text-[23px] font-bold tracking-tight text-[#f1f4f1]">{formatCop(plan.price)}<span className="ml-1 text-[10px] font-medium text-[#758077]">COP</span></p>
              </article>
            );
          })}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar membresías por estado">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              disabled={listLoading}
              onClick={() => {
                setFilter(item.value);
                setSearch("");
                void loadMemberships(1, item.value);
              }}
              className={`rounded-xl border px-3.5 py-2.5 text-[10px] font-semibold transition disabled:opacity-50 ${filter === item.value ? "border-[#b4f344]/25 bg-[#b4f344]/[0.08] text-[#b4f344]" : "border-white/[0.08] bg-[#111412] text-[#aeb7b0] hover:bg-white/[0.05]"}`}
            >{item.label}</button>
          ))}
        </div>
        <div className="flex h-10 items-center gap-2.5 rounded-xl border border-white/[0.07] bg-[#111412] px-3.5 xl:w-[320px]">
          <Icon name="search" size={16} className="text-[#6f7971]" />
          <input aria-label="Buscar por usuario o plan" value={search} onChange={(event) => { setSearch(event.target.value); setSearchPage(1); }} placeholder="Buscar por usuario o plan..." className="w-full bg-transparent text-[11px] text-white outline-none placeholder:text-[#687169]" />
        </div>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-[#f08b84]/20 bg-[#f08b84]/[0.06] px-4 py-3 text-xs leading-5 text-[#f2a19b]">{error}</p>}

      <Panel title="Membresías" subtitle="Registros recibidos desde el backend FITZONE" action={<span className="text-[10px] text-[#768078]">{listLoading ? "Buscando…" : `${filteredTotal.toLocaleString("es-CO")} resultados`}</span>}>
        <TableWrap minWidth="980px">
          <TableHead columns={["Usuario", "Plan", "Inicio", "Vencimiento", "Importe", "Estado", "Acciones"]} />
          <tbody>
            {listLoading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-xs text-[#89928b]">Cargando membresías…</td></tr>
            ) : visibleMemberships.length ? (
              visibleMemberships.map((membership) => (
                <tr key={membership.id} className="border-b border-white/[0.04] last:border-0 transition hover:bg-white/[0.018]">
                  <td className="whitespace-nowrap px-5 py-4 text-[10px] font-semibold text-[#dce2dd] sm:px-6">{membership.user.name}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-[10px] text-[#a3aca5] sm:px-6">Plan {PLAN_LABELS[membership.plan.type]}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-[10px] text-[#89928b] sm:px-6">{formatDate(membership.startDate)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-[10px] text-[#89928b] sm:px-6">{formatDate(membership.expirationDate)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-[10px] font-bold text-[#dbe2dc] sm:px-6">{formatCop(membership.amount)}</td>
                  <td className="px-5 py-4 sm:px-6"><span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-bold ${STATUS_STYLES[membership.status]}`}>{STATUS_LABELS[membership.status]}</span></td>
                  <td className="px-5 py-4 sm:px-6">
                    <button type="button" aria-label={`Editar membresía de ${membership.user.name}`} onClick={() => openEditForm(membership)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-[10px] font-semibold text-[#aeb7b0] transition hover:border-[#b4f344]/25 hover:bg-[#b4f344]/[0.07] hover:text-[#b4f344]">
                      <Icon name="calendar" size={14} />Editar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-xs text-[#89928b]">{isSearching && !error ? "No hay membresías que coincidan con la búsqueda." : error ? "No se pudieron cargar las membresías." : "No hay membresías para este filtro."}</td></tr>
            )}
          </tbody>
        </TableWrap>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.055] px-5 py-4 sm:flex-row sm:px-6">
          <span className="text-[10px] text-[#727c74]">{listLoading ? (isSearching ? "Buscando en las membresías…" : "Consultando el backend…") : `Página ${currentPage} de ${Math.max(filteredTotalPages, 1)} · ${filteredTotal} membresías`}</span>
          <div className="flex gap-2">
            <button type="button" disabled={listLoading || currentPage <= 1} onClick={() => isSearching ? setSearchPage(searchPage - 1) : void loadMemberships(pagination.page - 1, filter)} className="h-8 rounded-lg border border-white/[0.08] px-3 text-[10px] text-[#aeb7b0] transition enabled:hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
            <button type="button" disabled={listLoading || currentPage >= filteredTotalPages} onClick={() => isSearching ? setSearchPage(searchPage + 1) : void loadMemberships(pagination.page + 1, filter)} className="h-8 rounded-lg border border-white/[0.08] px-3 text-[10px] text-[#aeb7b0] transition enabled:hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </Panel>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) { setFormOpen(false); setEditingMembership(null); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="membership-form-title" className="my-auto w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#111412] shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.055] px-5 py-5 sm:px-6">
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#9cbc6c]">Administración · Planes</p>
                <h2 id="membership-form-title" className="text-lg font-bold text-[#f0f4f0]">{editingMembership ? "Editar membresía" : "Nueva membresía"}</h2>
                <p className="mt-1 text-[11px] text-[#818b83]">El importe y vencimiento se calculan en el backend.</p>
              </div>
              <button type="button" aria-label="Cerrar formulario" disabled={submitting} onClick={() => { setFormOpen(false); setEditingMembership(null); setError(""); }} className="rounded-lg p-2 text-[#929b94] transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"><Icon name="x" size={17} /></button>
            </div>

            <form key={editingMembership?.id ?? "new-membership"} onSubmit={submitMembership} className="space-y-4 px-5 py-5 sm:px-6">
              {!editingMembership && (
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold text-[#aeb7b0]">Usuario</span>
                  <select name="userId" required value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} disabled={usersLoading || users.length === 0} className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0d0c] px-3 text-xs text-white outline-none focus:border-[#b4f344]/40 disabled:opacity-50">
                    <option value="">{usersLoading ? "Cargando usuarios…" : users.length ? "Selecciona un usuario" : "No hay usuarios disponibles"}</option>
                    {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                  {!usersLoading && usersTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-1 text-[9px] text-[#7c867e]">
                      <span>Usuarios · página {usersPage} de {usersTotalPages}</span>
                      <div className="flex gap-2">
                        <button type="button" disabled={usersPage <= 1 || usersLoading} onClick={() => { setSelectedUserId(""); void loadUsers(usersPage - 1); }} className="rounded border border-white/[0.08] px-2 py-1 disabled:opacity-40">Anterior</button>
                        <button type="button" disabled={usersPage >= usersTotalPages || usersLoading} onClick={() => { setSelectedUserId(""); void loadUsers(usersPage + 1); }} className="rounded border border-white/[0.08] px-2 py-1 disabled:opacity-40">Siguiente</button>
                      </div>
                    </div>
                  )}
                </label>
              )}
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold text-[#aeb7b0]">Plan</span>
                <select name="planId" required defaultValue={editingMembership?.planId ?? ""} disabled={plansLoading || plans.length === 0} className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0d0c] px-3 text-xs text-white outline-none focus:border-[#b4f344]/40 disabled:opacity-50">
                  <option value="">{plansLoading ? "Cargando planes…" : plans.length ? "Selecciona un plan" : "No hay planes disponibles"}</option>
                  {plans.map((plan) => <option key={plan.id} value={plan.id}>Plan {PLAN_LABELS[plan.type]} · {plan.durationDays} días · {formatCop(plan.price)}</option>)}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold text-[#aeb7b0]">Fecha de inicio</span>
                  <input name="startDate" type="date" required defaultValue={editingMembership?.startDate.slice(0, 10) ?? ""} className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0d0c] px-3 text-xs text-white outline-none focus:border-[#b4f344]/40" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold text-[#aeb7b0]">Estado almacenado</span>
                  <select name="status" required defaultValue={editingMembership ? formStoredStatus : "ACTIVE"} className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0d0c] px-3 text-xs text-white outline-none focus:border-[#b4f344]/40">
                    <option value="ACTIVE">Activa</option>
                    <option value="CANCELLED">Cancelada</option>
                  </select>
                </label>
              </div>
              {editingMembership && <p className="rounded-xl border border-[#e3b65b]/15 bg-[#e3b65b]/[0.05] px-3 py-2.5 text-[10px] leading-5 text-[#cbb78d]">Cambiar el plan actualiza el importe al precio vigente y recalcula el vencimiento. Cambiar solo la fecha de inicio recalcula el vencimiento y conserva el importe.</p>}
              {formOptionsError && (
                <div role="alert" className="rounded-xl border border-[#f08b84]/20 bg-[#f08b84]/[0.06] px-3 py-2.5 text-[10px] leading-5 text-[#f2a19b]">
                  <p>{formOptionsError}</p>
                  <button type="button" onClick={() => { if (usersError && !editingMembership) void loadUsers(usersPage); if (plansError) void loadPlans(); }} className="mt-2 font-semibold underline underline-offset-2">Reintentar carga de opciones</button>
                </div>
              )}
              {error && <p role="alert" className="rounded-xl border border-[#f08b84]/20 bg-[#f08b84]/[0.06] px-3 py-2.5 text-[10px] leading-5 text-[#f2a19b]">{error}</p>}
              <div className="flex justify-end gap-2 border-t border-white/[0.055] pt-4">
                <button type="button" disabled={submitting} onClick={() => { setFormOpen(false); setEditingMembership(null); setError(""); }} className="h-10 rounded-xl border border-white/[0.09] px-4 text-xs font-semibold text-[#c4ccc5] transition hover:bg-white/[0.05] disabled:opacity-40">Cancelar</button>
                <button type="submit" disabled={submitting || plansLoading || Boolean(plansError) || plans.length === 0 || (!editingMembership && (usersLoading || Boolean(usersError) || users.length === 0))} className="inline-flex h-10 min-w-36 items-center justify-center rounded-xl bg-[#b4f344] px-4 text-xs font-bold text-[#141a0e] transition hover:bg-[#c1fa5b] disabled:cursor-wait disabled:opacity-60">
                  {submitting ? "Guardando…" : editingMembership ? "Guardar cambios" : "Registrar membresía"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
