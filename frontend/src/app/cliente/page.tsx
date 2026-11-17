"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
type PortalData = {
  id: string; name: string; email: string; phone: string | null; createdAt: string | null;
  memberships: { id: string; startDate: string; expirationDate: string; status: string; amount: string; plan: { type: string; durationDays: number; price: string } }[];
  payments: { id: string; paidAt: string; amount: string; method: string; membership: { plan: { type: string } } }[];
};
type Plan = { id: string; type: string; durationDays: number; price: string };
const planNames: Record<string, string> = { MONTHLY: "Mensual", QUARTERLY: "Trimestral", SEMIANNUAL: "Semestral", ANNUAL: "Anual" };
const money = (value: string | number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value));
const date = (value: string) => new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric" }).format(new Date(value));

export default function CustomerPage() {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!API) { setError("No está configurada la conexión con FITZONE."); setBusy(false); return; }
      try {
        const session = await fetch(`${API}/auth/session`, { credentials: "include", cache: "no-store" });
        if (!session.ok) { router.replace("/login"); return; }
        const identity = await session.json() as { role?: string };
        if (identity.role !== "CUSTOMER") { router.replace("/"); return; }
        const [profile, planResponse] = await Promise.all([
          fetch(`${API}/auth/me`, { credentials: "include", cache: "no-store" }),
          fetch(`${API}/plans`, { credentials: "include", cache: "no-store" }),
        ]);
        if (!profile.ok || !planResponse.ok) throw new Error("No se pudo cargar tu información. Inténtalo de nuevo.");
        const [profileData, availablePlans] = await Promise.all([profile.json(), planResponse.json()]) as [PortalData, { data: Plan[] }];
        if (active) { setData(profileData); setPlans(availablePlans.data); setNow(Date.now()); }
      } catch (cause) { if (active) setError(cause instanceof TypeError ? "No se pudo conectar con FITZONE." : cause instanceof Error ? cause.message : "Error al consultar tu cuenta."); }
      finally { if (active) setBusy(false); }
    }
    void load(); return () => { active = false; };
  }, [router]);
  async function logout() {
    if (!API) return;
    setLoggingOut(true);
    try { await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include", cache: "no-store" }); router.replace("/login"); router.refresh(); }
    finally { setLoggingOut(false); }
  }
  const membership = data?.memberships[0];
  const daysLeft = membership && now ? Math.max(0, Math.ceil((new Date(membership.expirationDate).getTime() - now) / 86400000)) : 0;
  const expired = Boolean(membership && (membership.status === "CANCELLED" || (now > 0 && new Date(membership.expirationDate).getTime() < now)));
  return <main className="min-h-screen bg-[#0b0d0c] px-4 py-6 text-[#eef2ef] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-[#101311] px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b4f344] text-[#11150d]">FZ</span><div><p className="text-sm font-black tracking-[0.16em]">FIT<span className="text-[#b4f344]">ZONE</span></p><p className="text-[10px] text-[#778178]">Portal de cliente</p></div></div>
        <button onClick={() => void logout()} disabled={loggingOut} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-[#b8c0ba] hover:border-[#b4f344]/30">{loggingOut ? "Cerrando…" : "Cerrar sesión"}</button>
      </header>
      {busy && <p role="status" className="py-12 text-center text-sm text-[#929b94]">Cargando tu espacio…</p>}
      {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-[#111412] p-5 text-sm text-[#f2a19b]">{error}</div>}
      {data && <>
        <section className="mb-6 rounded-2xl border border-[#b4f344]/15 bg-[radial-gradient(ellipse_at_10%_0%,rgba(180,243,68,0.12),transparent_50%),#101311] p-6 sm:p-9"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9cbc6c]">TU ESPACIO PERSONAL</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Hola, {data.name}</h1><p className="mt-3 text-sm text-[#929b94]">Aquí puedes consultar tu perfil, membresía y pagos registrados.</p></section>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/[0.07] bg-[#101311] p-6"><h2 className="text-lg font-bold">Mi perfil</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs text-[#778178]">Nombre</dt><dd className="mt-1">{data.name}</dd></div><div><dt className="text-xs text-[#778178]">Correo</dt><dd className="mt-1">{data.email}</dd></div><div><dt className="text-xs text-[#778178]">Teléfono</dt><dd className="mt-1">{data.phone || "No registrado"}</dd></div><div><dt className="text-xs text-[#778178]">Cuenta creada</dt><dd className="mt-1">{data.createdAt ? date(data.createdAt) : "Fecha histórica no registrada"}</dd></div></dl></section>
          <section className="rounded-2xl border border-white/[0.07] bg-[#101311] p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Mi membresía</h2>{membership && <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${expired ? "bg-red-400/10 text-red-300" : "bg-[#b4f344]/10 text-[#b4f344]"}`}>{expired ? "Vencida o cancelada" : "Activa"}</span>}</div>{membership ? <><p className="mt-5 text-2xl font-bold">Plan {planNames[membership.plan.type] ?? membership.plan.type}</p><div className="mt-4 grid grid-cols-2 gap-4 text-sm"><div><p className="text-xs text-[#778178]">Inicio</p><p className="mt-1">{date(membership.startDate)}</p></div><div><p className="text-xs text-[#778178]">Vencimiento</p><p className="mt-1">{date(membership.expirationDate)}</p></div></div>{!expired && <p className="mt-4 text-xs text-[#b4f344]">{daysLeft} días restantes</p>}</> : <p className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm leading-6 text-[#929b94]">Aún no tienes una membresía asignada. Consulta los planes disponibles o comunícate con el gimnasio.</p>}</section>
        </div>
        <section className="mt-5 rounded-2xl border border-white/[0.07] bg-[#101311] p-6"><h2 className="text-lg font-bold">Planes disponibles</h2><p className="mt-1 text-xs text-[#929b94]">Información de referencia. La asignación y el pago se gestionan directamente en el gimnasio.</p>{plans.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{plans.map((plan) => <article key={plan.id} className="rounded-xl border border-white/[0.07] bg-[#0d100e] p-4"><p className="text-xs font-bold text-[#b4f344]">{planNames[plan.type] ?? plan.type}</p><p className="mt-2 text-xl font-bold">{money(plan.price)}</p><p className="mt-1 text-[10px] text-[#778178]">{plan.durationDays} días</p></article>)}</div> : <p className="mt-4 text-sm text-[#929b94]">No hay planes disponibles.</p>}</section>
        <section className="mt-5 rounded-2xl border border-white/[0.07] bg-[#101311] p-6"><h2 className="text-lg font-bold">Mi historial de pagos</h2>{data.payments.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="text-[#778178]"><tr><th className="pb-3">Fecha</th><th>Plan</th><th>Método</th><th className="text-right">Valor</th></tr></thead><tbody>{data.payments.map((payment) => <tr key={payment.id} className="border-t border-white/[0.06]"><td className="py-3">{date(payment.paidAt)}</td><td>{planNames[payment.membership.plan.type] ?? payment.membership.plan.type}</td><td>{payment.method.replaceAll("_", " ")}</td><td className="text-right">{money(payment.amount)}</td></tr>)}</tbody></table></div> : <p className="mt-4 rounded-xl bg-white/[0.02] p-4 text-sm text-[#929b94]">Todavía no hay pagos registrados para tu cuenta.</p>}</section>
      </>}
      <footer className="py-8 text-center text-[10px] text-[#586259]">FITZONE · Gestión de gimnasio</footer>
    </div>
  </main>;
}
