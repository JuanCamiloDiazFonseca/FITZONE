"use client";

import { startTransition, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { AdminShell } from "@/components/admin-shell";
import { Icon } from "@/components/icon";
import { Avatar, PageHeading, Panel, StatCard, TableHead, TableWrap } from "@/components/ui";

type UserRecord = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string;
};

type UsersResponse = {
  data: UserRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type UserFormValues = Pick<UserRecord, "name" | "document" | "phone" | "email">;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
const PAGE_SIZE = 20;
const AVATAR_COLORS = [
  "from-lime-300 to-emerald-400",
  "from-sky-300 to-indigo-400",
  "from-violet-300 to-fuchsia-400",
  "from-amber-300 to-orange-400",
  "from-teal-300 to-cyan-500",
];

function initialsFor(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? "")
    .join("");
}

function getAvatarColor(id: string): string {
  const index = [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function RowActionIcon({ type }: { type: "edit" | "delete" }) {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {type === "edit" ? (
        <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>
      ) : (
        <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v5m4-5v5" /></>
      )}
    </svg>
  );
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
    // Use the generic message when the response does not contain JSON.
  }

  return "No se pudo completar la solicitud. Revisa los datos e inténtalo de nuevo.";
}

export function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pagination, setPagination] = useState<UsersResponse["pagination"]>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");

  const loadUsers = useCallback(async (page: number, newUser?: UserRecord) => {
    if (!API_BASE_URL) {
      setError("Falta configurar NEXT_PUBLIC_API_BASE_URL en el frontend.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await authFetch(
        `${API_BASE_URL}/users?page=${page}&limit=${PAGE_SIZE}`,
        { headers: { Accept: "application/json" }, cache: "no-store", credentials: "include" },
      );
      if (!response.ok) throw new Error(await readErrorMessage(response));

      const result = (await response.json()) as UsersResponse;
      const resultUsers = newUser && !result.data.some((user) => user.id === newUser.id)
        ? [newUser, ...result.data].slice(0, PAGE_SIZE)
        : result.data;

      setUsers(resultUsers);
      setPagination(result.pagination);
    } catch (requestError) {
      setError(
        requestError instanceof TypeError
          ? "No se pudo conectar con el backend. Verifica que NestJS esté ejecutándose y que CORS permita el origen del frontend."
          : requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar los usuarios.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => { void loadUsers(1); });
  }, [loadUsers]);

  const visibleUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) return users;

    return users.filter((user) =>
      [user.name, user.document ?? "", user.phone ?? "", user.email]
        .some((value) => value.toLocaleLowerCase().includes(normalizedSearch)),
    );
  }, [search, users]);

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!API_BASE_URL) {
      setError("Falta configurar NEXT_PUBLIC_API_BASE_URL en el frontend.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const userData: UserFormValues = {
      name: String(formData.get("name") ?? "").trim(),
      document: String(formData.get("document") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
    };

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await authFetch(
        editingUser
          ? `${API_BASE_URL}/users/${encodeURIComponent(editingUser.id)}`
          : `${API_BASE_URL}/users`,
        {
        method: editingUser ? "PATCH" : "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(userData),
        },
      );
      if (!response.ok) throw new Error(await readErrorMessage(response));

      const savedUser = (await response.json()) as UserRecord;
      const wasEditing = Boolean(editingUser);
      setFormOpen(false);
      setEditingUser(null);
      setSearch("");
      setSuccess(wasEditing ? "Los datos del usuario se actualizaron correctamente." : "Usuario registrado correctamente.");
      form.reset();
      await loadUsers(wasEditing ? pagination.page : 1, savedUser);
    } catch (requestError) {
      setError(
        requestError instanceof TypeError
          ? "No se pudo conectar con el backend. Verifica que NestJS esté ejecutándose y que CORS permita el origen del frontend."
          : requestError instanceof Error
            ? requestError.message
            : "No se pudo guardar el usuario.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteUser() {
    if (!API_BASE_URL || !userToDelete) {
      if (!API_BASE_URL) setError("Falta configurar NEXT_PUBLIC_API_BASE_URL en el frontend.");
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await authFetch(`${API_BASE_URL}/users/${encodeURIComponent(userToDelete.id)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      if (response.status === 409) {
        throw new Error(`No se puede eliminar a ${userToDelete.name} porque tiene membresías o pagos asociados.`);
      }
      if (!response.ok) throw new Error(await readErrorMessage(response));

      const deletedName = userToDelete.name;
      const nextPage = users.length === 1 && pagination.page > 1
        ? pagination.page - 1
        : pagination.page;
      setUserToDelete(null);
      setSuccess(`El usuario ${deletedName} fue eliminado correctamente.`);
      await loadUsers(nextPage);
    } catch (requestError) {
      setError(
        requestError instanceof TypeError
          ? "No se pudo conectar con el backend. Verifica que NestJS esté ejecutándose y que CORS permita el origen del frontend."
          : requestError instanceof Error
            ? requestError.message
            : "No se pudo eliminar el usuario.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminShell>
      <PageHeading
        eyebrow="Administración · Personas"
        title="Usuarios"
        description="Consulta y organiza los perfiles de las personas registradas en FITZONE."
        action={
          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setEditingUser(null);
              setFormOpen(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#b4f344] px-4 text-xs font-bold text-[#141a0e] shadow-[0_5px_20px_rgba(180,243,68,0.1)] transition hover:bg-[#c1fa5b]"
          >
            <Icon name="plus" size={15} />Nuevo usuario
          </button>
        }
      />

      {success && (
        <p role="status" className="mb-5 rounded-xl border border-[#b4f344]/15 bg-[#b4f344]/[0.06] px-4 py-3 text-xs text-[#b4f344]">
          {success}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-5 rounded-xl border border-[#f08b84]/20 bg-[#f08b84]/[0.06] px-4 py-3 text-xs leading-5 text-[#f2a19b]">
          {error}
        </p>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Usuarios registrados" value={loading ? "…" : pagination.total.toLocaleString("es-CO")} change="Registros" icon="users" note="datos del backend" />
        <StatCard label="En esta página" value={loading ? "…" : users.length.toLocaleString("es-CO")} change="Usuarios" trend="neutral" icon="check" note="listado recibido" />
        <StatCard label="Página actual" value={loading ? "…" : `${pagination.page} / ${Math.max(pagination.totalPages, 1)}`} change="Paginación" icon="calendar" note="consulta al backend" />
      </div>

      <div className="mb-4 flex h-10 items-center gap-2.5 rounded-xl border border-white/[0.07] bg-[#111412] px-3.5 sm:max-w-[360px]">
        <Icon name="search" size={16} className="text-[#6f7971]" />
        <input
          aria-label="Buscar usuarios en esta página"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, documento o correo..."
          className="w-full bg-transparent text-[11px] text-white outline-none placeholder:text-[#687169]"
        />
      </div>

      <Panel
        title="Directorio de usuarios"
        subtitle="Perfiles recibidos del backend FITZONE"
        action={<span className="text-[10px] text-[#768078]">{pagination.total.toLocaleString("es-CO")} registros</span>}
      >
        <TableWrap minWidth="920px">
          <TableHead columns={["Usuario", "Documento", "Teléfono", "Correo electrónico", "Acciones"]} />
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-xs text-[#89928b]">Cargando usuarios…</td></tr>
            ) : visibleUsers.length ? (
              visibleUsers.map((user) => (
                <tr key={user.id} className="border-b border-white/[0.04] last:border-0 transition hover:bg-white/[0.018]">
                  <td className="px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <Avatar initials={initialsFor(user.name)} color={getAvatarColor(user.id)} />
                      <p className="whitespace-nowrap text-[11px] font-semibold text-[#dce2dd]">{user.name}</p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-[10px] text-[#a3aca5] sm:px-6">{user.document || "—"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-[10px] text-[#a3aca5] sm:px-6">{user.phone || "—"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-[10px] text-[#89928b] sm:px-6">{user.email}</td>
                  <td className="px-4 py-4 sm:px-5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        aria-label={`Editar usuario ${user.name}`}
                        title="Editar usuario"
                        disabled={loading || deleting}
                        onClick={() => {
                          setError("");
                          setSuccess("");
                          setEditingUser(user);
                          setFormOpen(true);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-[#aeb7b0] transition hover:border-[#b4f344]/25 hover:bg-[#b4f344]/[0.07] hover:text-[#b4f344] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <RowActionIcon type="edit" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Eliminar usuario ${user.name}`}
                        title="Eliminar usuario"
                        disabled={loading || deleting}
                        onClick={() => {
                          setError("");
                          setSuccess("");
                          setUserToDelete(user);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-[#c78d86] transition hover:border-[#f08b84]/30 hover:bg-[#f08b84]/[0.08] hover:text-[#f2a19b] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <RowActionIcon type="delete" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-xs text-[#89928b]">
                  {users.length ? "No hay usuarios que coincidan con la búsqueda." : "Todavía no hay usuarios registrados."}
                </td>
              </tr>
            )}
          </tbody>
        </TableWrap>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.055] px-5 py-4 sm:flex-row sm:px-6">
          <span className="text-[10px] text-[#727c74]">
            {loading ? "Consultando el backend…" : `Página ${pagination.page} de ${Math.max(pagination.totalPages, 1)} · ${pagination.total} usuarios`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || pagination.page <= 1}
              onClick={() => void loadUsers(pagination.page - 1)}
              className="h-8 rounded-lg border border-white/[0.08] px-3 text-[10px] text-[#aeb7b0] transition enabled:hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
            >Anterior</button>
            <button
              type="button"
              disabled={loading || pagination.page >= pagination.totalPages}
              onClick={() => void loadUsers(pagination.page + 1)}
              className="h-8 rounded-lg border border-white/[0.08] px-3 text-[10px] text-[#aeb7b0] transition enabled:hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
            >Siguiente</button>
          </div>
        </div>
      </Panel>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) { setFormOpen(false); setEditingUser(null); setError(""); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="user-form-title" className="my-auto w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#111412] shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.055] px-5 py-5 sm:px-6">
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#9cbc6c]">Administración · Personas</p>
                <h2 id="user-form-title" className="text-lg font-bold text-[#f0f4f0]">{editingUser ? "Editar usuario" : "Registrar usuario"}</h2>
                <p className="mt-1 text-[11px] text-[#818b83]">{editingUser ? "Actualiza los datos de la persona." : "Completa los datos de la persona."}</p>
              </div>
              <button type="button" aria-label="Cerrar formulario" disabled={submitting} onClick={() => { setFormOpen(false); setEditingUser(null); setError(""); }} className="rounded-lg p-2 text-[#929b94] transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40">
                <Icon name="x" size={17} />
              </button>
            </div>

            <form key={editingUser?.id ?? "new-user"} onSubmit={submitUser} className="space-y-4 px-5 py-5 sm:px-6">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold text-[#aeb7b0]">Nombre completo</span>
                <input name="name" required maxLength={160} defaultValue={editingUser?.name ?? ""} autoComplete="name" className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0d0c] px-3 text-xs text-white outline-none transition placeholder:text-[#535d56] focus:border-[#b4f344]/40" placeholder="Nombre y apellidos" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold text-[#aeb7b0]">Documento</span>
                  <input name="document" required maxLength={40} defaultValue={editingUser?.document ?? ""} autoComplete="off" className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0d0c] px-3 text-xs text-white outline-none transition placeholder:text-[#535d56] focus:border-[#b4f344]/40" placeholder="Número de documento" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold text-[#aeb7b0]">Teléfono</span>
                  <input name="phone" type="tel" required maxLength={30} defaultValue={editingUser?.phone ?? ""} autoComplete="tel" className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0d0c] px-3 text-xs text-white outline-none transition placeholder:text-[#535d56] focus:border-[#b4f344]/40" placeholder="Número de contacto" />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold text-[#aeb7b0]">Correo electrónico</span>
                <input name="email" type="email" required maxLength={254} defaultValue={editingUser?.email ?? ""} autoComplete="email" className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0d0c] px-3 text-xs text-white outline-none transition placeholder:text-[#535d56] focus:border-[#b4f344]/40" placeholder="nombre@correo.com" />
              </label>
              {error && <p role="alert" className="rounded-xl border border-[#f08b84]/20 bg-[#f08b84]/[0.06] px-3 py-2.5 text-[10px] leading-5 text-[#f2a19b]">{error}</p>}
              <div className="flex justify-end gap-2 border-t border-white/[0.055] pt-4">
                <button type="button" disabled={submitting} onClick={() => { setFormOpen(false); setEditingUser(null); setError(""); }} className="h-10 rounded-xl border border-white/[0.09] px-4 text-xs font-semibold text-[#c4ccc5] transition hover:bg-white/[0.05] disabled:opacity-40">Cancelar</button>
                <button type="submit" disabled={submitting} className="inline-flex h-10 min-w-36 items-center justify-center gap-2 rounded-xl bg-[#b4f344] px-4 text-xs font-bold text-[#141a0e] transition hover:bg-[#c1fa5b] disabled:cursor-wait disabled:opacity-60">
                  {submitting ? (editingUser ? "Guardando…" : "Registrando…") : (editingUser ? "Guardar cambios" : "Registrar usuario")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title" aria-describedby="delete-user-description" className="my-auto w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111412] shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
            <div className="border-b border-white/[0.055] px-5 py-5 sm:px-6">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#e3a39d]">Confirmación requerida</p>
              <h2 id="delete-user-title" className="text-lg font-bold text-[#f0f4f0]">Eliminar usuario</h2>
              <p id="delete-user-description" className="mt-2 text-xs leading-5 text-[#aeb7b0]">
                ¿Quieres eliminar a <span className="font-semibold text-white">{userToDelete.name}</span>? Esta acción no se puede deshacer. Si tiene membresías o pagos asociados, el servidor impedirá la eliminación.
              </p>
            </div>
            {error && <p role="alert" className="mx-5 mt-4 rounded-xl border border-[#f08b84]/20 bg-[#f08b84]/[0.06] px-3 py-2.5 text-[10px] leading-5 text-[#f2a19b] sm:mx-6">{error}</p>}
            <div className="flex justify-end gap-2 px-5 py-5 sm:px-6">
              <button type="button" disabled={deleting} onClick={() => { setUserToDelete(null); setError(""); }} className="h-10 rounded-xl border border-white/[0.09] px-4 text-xs font-semibold text-[#c4ccc5] transition hover:bg-white/[0.05] disabled:opacity-40">Cancelar</button>
              <button type="button" disabled={deleting} onClick={() => void deleteUser()} className="inline-flex h-10 min-w-32 items-center justify-center gap-2 rounded-xl border border-[#f08b84]/25 bg-[#f08b84]/[0.1] px-4 text-xs font-bold text-[#f2a19b] transition hover:bg-[#f08b84]/[0.17] disabled:cursor-wait disabled:opacity-60">
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
