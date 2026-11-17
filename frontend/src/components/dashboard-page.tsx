"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { ColombiaClock } from "@/components/colombia-clock";
import { Panel, StatCard, TableHead, TableWrap } from "@/components/ui";
import { authFetch } from "@/lib/auth-fetch";
import { cop, localDate, methods, monthLabel, plans, statuses, type DashboardData } from "@/lib/dashboard";

const API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
const linkClass = "text-[11px] font-bold text-[#b4f344] hover:text-[#d0ff81]";
const buttonClass = "rounded-xl border border-[#b4f344]/20 px-4 py-2 text-xs font-bold text-[#b4f344] disabled:opacity-50";
const emptyClass = "px-5 py-8 text-xs leading-6 text-[#929b94]";

function RevenueChart({ data }: { data: DashboardData }) {
  const [period, setPeriod] = useState(12);
  const months = data.revenueByMonth.slice(-period);
  const maximum = Math.max(1, ...months.map((month) => Number(month.amount)));
  const coordinates = months.map((month, index) => ({ x: 20 + index * 610 / Math.max(1, months.length - 1), y: 174 - Number(month.amount) / maximum * 150 }));
  const points = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  return (
    <Panel title="Ingresos registrados" subtitle="Pagos agrupados por mes en Colombia" action={<select aria-label="Período de ingresos" value={period} onChange={(event) => setPeriod(Number(event.target.value))} className="max-w-32 rounded-lg border border-white/10 bg-[#111412] p-2 text-[11px] text-[#c4ccc5]"><option value={12}>12 meses</option><option value={6}>6 meses</option><option value={3}>3 meses</option></select>}>
      <div className="px-5 py-5 sm:px-6">
        <p className="text-2xl font-bold text-[#f1f4f1]">{cop(months.reduce((sum, month) => sum + Number(month.amount), 0))}</p>
        <p className="mt-1 text-[10px] text-[#929b94]">COP · total del período seleccionado</p>
        {!months.some((month) => month.payments > 0) && <p className="mt-3 text-xs text-[#929b94]">No hay pagos en este período.</p>}
        <div className="chart-grid mt-6 h-[180px] rounded-lg">
          <svg aria-label={`Ingresos reales de los últimos ${period} meses`} role="img" viewBox="0 0 650 190" preserveAspectRatio="none" className="h-full w-full">
            <defs><linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#b4f344" stopOpacity=".22" /><stop offset="100%" stopColor="#b4f344" stopOpacity="0" /></linearGradient></defs>
            <polygon points={`20,184 ${points} 630,184`} fill="url(#revenueFill)" />
            <polyline points={points} fill="none" stroke="#b4f344" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            {coordinates.map(({ x, y }, index) => <circle key={months[index].month} cx={x} cy={y} r="3" fill="#b4f344"><title>{monthLabel(months[index].month)}: {cop(months[index].amount)}</title></circle>)}
          </svg>
        </div>
        <div aria-label="Meses del gráfico" className="relative mt-3 h-4 text-[9px] text-[#929b94]">{months.map((month, index) => <span key={month.month} style={{ left: `${index / Math.max(1, months.length - 1) * 100}%`, transform: `translateX(${index === 0 ? 0 : index === months.length - 1 ? -100 : -50}%)` }} className={`absolute whitespace-nowrap ${period === 12 && index % 4 !== 0 && index !== months.length - 1 ? "hidden sm:inline" : ""}`}>{monthLabel(month.month)}</span>)}</div>
        <details className="mt-5 text-xs text-[#aeb7b0]"><summary className="cursor-pointer text-[#b4f344]">Ver valores mensuales</summary><div className="overflow-x-auto"><table aria-label="Ingresos por mes" className="mt-3 w-full text-left"><thead><tr><th>Mes</th><th>Pagos</th><th>Ingresos COP</th></tr></thead><tbody>{months.map((month) => <tr key={month.month}><td className="py-2">{monthLabel(month.month)}</td><td>{month.payments}</td><td>{cop(month.amount)}</td></tr>)}</tbody></table></div></details>
      </div>
    </Panel>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    let pending = false;
    const controller = new AbortController();
    async function load() {
      if (pending || document.hidden) return;
      pending = true;
      setLoading(true);
      setError("");
      try {
        if (!API) throw new Error("Falta configurar la URL del backend.");
        const response = await authFetch(`${API}/dashboard`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("No se pudo cargar el resumen del gimnasio.");
        const result: DashboardData = await response.json();
        if (active) setData(result);
      } catch (cause) {
        if (active) setError(cause instanceof TypeError
          ? "No se pudo conectar con el backend. Comprueba tu conexión e inténtalo de nuevo."
          : cause instanceof SyntaxError ? "El backend devolvió una respuesta no válida."
          : cause instanceof Error ? cause.message : "No se pudo cargar el resumen del gimnasio.");
      } finally {
        pending = false;
        if (active) setLoading(false);
      }
    }
    const update = () => { void load(); };
    void load();
    const timer = window.setInterval(update, 60000);
    window.addEventListener("focus", update);
    window.addEventListener("fitzone:data-changed", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      window.removeEventListener("fitzone:data-changed", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh]);

  const metrics = data?.metrics;
  const growth = data?.comparison.percentage;
  return (
    <AdminShell>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3"><div><ColombiaClock /><h1 className="mt-2 text-[25px] font-bold tracking-tight text-[#f1f4f1] sm:text-[31px]">Bienvenido a FITZONE <span aria-hidden="true">✦</span></h1><p className="mt-2 text-xs text-[#929b94]">Este es el resumen operativo de tu gimnasio.</p></div><button type="button" className={buttonClass} disabled={loading} onClick={() => setRefresh((value) => value + 1)}>Actualizar resumen</button></div>
      {loading && <p role="status" className="mb-4 text-xs text-[#aeb7b0]">Actualizando estadísticas…</p>}
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-400/20 p-4 text-sm text-[#f2a19b]">{error} {data && "Se conserva la última consulta; los valores pueden haber cambiado."}<button type="button" className={`${buttonClass} ml-3`} onClick={() => setRefresh((value) => value + 1)}>Reintentar</button></div>}
      {data && metrics && <>
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total de usuarios" value={metrics.totalUsers.toLocaleString("es-CO")} change="Registrados" trend="neutral" icon="users" note="Total de la base de datos" />
          <StatCard label="Membresías activas" value={String(metrics.activeMemberships)} change="Vigentes" trend="neutral" icon="card" note="Vencimiento a más de 5 días" />
          <StatCard label="Próximas a vencer" value={String(metrics.upcomingMemberships)} change="5 días" trend="neutral" icon="clock" note="Sin incluir canceladas" />
          <StatCard label="Ingresos totales" value={cop(metrics.totalRevenue)} change="COP" trend="neutral" icon="activity" note="Todos los pagos registrados" />
          <StatCard label="Ingresos del mes" value={cop(metrics.currentMonthRevenue)} change={growth == null ? "Sin comparación" : `${Number(growth).toLocaleString("es-CO")}%`} trend={growth == null || Number(growth) === 0 ? "neutral" : Number(growth) > 0 ? "up" : "down"} icon="credit-card" note={growth == null ? "Sin pagos del mes anterior" : "Mes en curso vs. mes anterior completo"} />
          <StatCard label="Membresías vencidas" value={String(metrics.expiredMemberships)} change="Vencidas" trend="neutral" icon="clock" note="Sin incluir canceladas" />
          <StatCard label="Usuarios nuevos del mes" value={metrics.newUsersThisMonth === null ? "No disponible" : String(metrics.newUsersThisMonth)} change={metrics.registrationDatesAvailable ? "Fechas registradas" : "Sin fecha de alta"} trend="neutral" icon="users" note={metrics.registrationDatesAvailable ? (metrics.usersWithoutRegistrationDate ? "Existen usuarios sin fecha histórica" : "Mes actual de Colombia") : "El esquema actual no guarda este dato"} />
        </div>
        <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]">
          <RevenueChart data={data} />
          <Panel title="Próximos vencimientos" subtitle="Membresías que vencen en los próximos 5 días" action={<span className="text-xs text-[#e3b65b]">{metrics.upcomingMemberships} en total</span>}>
            {data.expiringMemberships.length === 0 ? <p className={emptyClass}>No hay membresías próximas a vencer en los próximos cinco días.</p> : <ul className="divide-y divide-white/5 px-5">{data.expiringMemberships.map((membership) => <li key={membership.id} className="flex flex-wrap justify-between gap-3 py-4"><div><p className="text-xs font-semibold">{membership.userName}</p><p className="mt-1 text-[11px] text-[#929b94]">{plans[membership.planType] ?? membership.planType}</p></div><p className="text-xs text-[#e3b65b]">{localDate(membership.expirationDate)}</p></li>)}</ul>}
            <div className="border-t border-white/5 px-5 py-4"><Link href="/membresias" className={linkClass}>Ver todas las membresías →</Link>{metrics.upcomingMemberships > data.expiringMemberships.length && <p className="mt-2 text-[10px] text-[#929b94]">Se muestran los seis vencimientos más próximos.</p>}</div>
          </Panel>
        </div>
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.5fr_1fr]">
          <Panel title="Usuarios registrados" subtitle="Vista alfabética · última membresía registrada por usuario" action={<Link href="/usuarios" className={linkClass}>Ver usuarios →</Link>}>
            {data.users.length === 0 ? <p className={emptyClass}>No hay usuarios registrados.</p> : <TableWrap minWidth="560px"><TableHead columns={["Usuario", "Membresía", "Estado", "Vencimiento"]} /><tbody>{data.users.map((user) => <tr key={user.id} className="border-b border-white/5 text-[11px] last:border-0"><td className="px-5 py-4"><p className="font-semibold">{user.name}</p><p className="mt-1 text-[#929b94]">{user.email}</p></td><td className="px-5 py-4">{user.membership ? plans[user.membership.planType] ?? user.membership.planType : "Sin membresía"}</td><td className="px-5 py-4 text-[#b4f344]">{user.membership ? statuses[user.membership.status] ?? user.membership.status : "—"}</td><td className="whitespace-nowrap px-5 py-4">{user.membership ? localDate(user.membership.expirationDate) : "—"}</td></tr>)}</tbody></TableWrap>}
          </Panel>
          <Panel title="Últimos pagos" subtitle="Pagos registrados · más recientes primero" action={<Link href="/pagos" className={linkClass}>Ver pagos →</Link>}>
            {data.recentPayments.length === 0 ? <p className={emptyClass}>No hay pagos registrados.</p> : <ul className="divide-y divide-white/5 px-5">{data.recentPayments.map((payment) => <li key={payment.id} className="flex flex-wrap justify-between gap-3 py-4 text-xs"><div><p className="font-semibold">{payment.userName}</p><p className="mt-1 text-[10px] text-[#929b94]">{plans[payment.planType] ?? payment.planType} · {methods[payment.method] ?? payment.method}</p></div><div className="text-right"><p className="font-bold">{cop(payment.amount)}</p><p className="mt-1 text-[10px] text-[#929b94]">{localDate(payment.paidAt)}</p></div></li>)}</ul>}
          </Panel>
        </div>
        <p className="mt-6 text-center text-[10px] text-[#929b94]">Última consulta: {localDate(data.generatedAt)} · {new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(data.generatedAt))} Colombia · Actualización automática cada minuto</p>
      </>}
    </AdminShell>
  );
}
