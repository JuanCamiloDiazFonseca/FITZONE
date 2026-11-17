"use client";

import Link from "next/link";
import { authFetch } from "@/lib/auth-fetch";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icon";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");

const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Dashboard", icon: "grid" },
  { href: "/usuarios", label: "Usuarios", icon: "users" },
  { href: "/membresias", label: "Membresías", icon: "card" },
  { href: "/pagos", label: "Pagos", icon: "credit-card" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "error">("checking");
  const [sessionError, setSessionError] = useState("");
  const [sessionRetry, setSessionRetry] = useState(0);

  useEffect(() => {
    let active = true;
    async function verifySession() {
      setSessionState("checking");
      setSessionError("");
      if (!API_BASE_URL) {
        setSessionError("Falta configurar la URL del backend.");
        setSessionState("error");
        return;
      }

      try {
        const response = await authFetch(`${API_BASE_URL}/auth/session`, {
          headers: { Accept: "application/json" },
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("No se pudo validar la sesión administrativa.");
        const identity = await response.json() as { role?: string };
        if (identity.role !== "ADMIN") {
          router.replace(identity.role === "CUSTOMER" ? "/cliente" : "/login");
          return;
        }
        if (active) setSessionState("ready");
      } catch (error) {
        if (active) {
          setSessionError(error instanceof TypeError
            ? "No se pudo conectar con NestJS para validar la sesión."
            : error instanceof Error ? error.message : "No se pudo validar la sesión.");
          setSessionState("error");
        }
      }
    }

    void verifySession();
    return () => { active = false; };
  }, [router, sessionRetry]);

  async function signOut() {
    if (!API_BASE_URL) {
      setLogoutError("Falta configurar la URL del backend.");
      return;
    }
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await authFetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof TypeError
        ? "No se pudo conectar con NestJS para cerrar la sesión."
        : error instanceof Error ? error.message : "No se pudo cerrar la sesión.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (sessionState !== "ready") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0d0c] px-4 text-[#eef2ef]">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111412] p-6 text-center">
          {sessionState === "checking" ? (
            <p role="status" className="text-sm text-[#aeb7b0]">Verificando sesión…</p>
          ) : (
            <>
              <p role="alert" className="text-sm text-[#f2a19b]">{sessionError}</p>
              <button type="button" onClick={() => setSessionRetry((attempt) => attempt + 1)} className="mt-4 rounded-xl bg-[#b4f344] px-4 py-2 text-xs font-bold text-[#141a0e]">Reintentar</button>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d0c] text-[#eef2ef]">
      {menuOpen && (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-black/70 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-white/[0.07] bg-[#101311] transition-transform duration-200 md:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[82px] items-center gap-3 px-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b4f344] text-[#11150d] shadow-[0_0_24px_rgba(180,243,68,0.18)]">
            <Icon name="dumbbell" size={22} />
          </div>
          <div>
            <p className="text-[17px] font-black tracking-[0.16em]">FIT<span className="text-[#b4f344]">ZONE</span></p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#737c75]">Gym management</p>
          </div>
          <button aria-label="Cerrar menú" className="ml-auto rounded-lg p-2 text-[#9ca59e] hover:bg-white/5 md:hidden" onClick={() => setMenuOpen(false)}>
            <Icon name="x" />
          </button>
        </div>

        <div className="mx-5 mt-6 rounded-xl border border-[#b4f344]/10 bg-[#b4f344]/[0.055] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#778071]">Gimnasio</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#e2e9e3]">FITZONE <span className="h-1.5 w-1.5 rounded-full bg-[#b4f344]" /></p>
        </div>

        <nav aria-label="Navegación principal" className="mt-8 flex-1 px-4">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#68716a]">Menú principal</p>
          <div className="space-y-1">
            {navigation.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition ${active ? "bg-[#b4f344] text-[#11150d] shadow-[0_5px_20px_rgba(180,243,68,0.12)]" : "text-[#939c95] hover:bg-white/[0.045] hover:text-white"}`}
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#29351b]" />}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mx-5 mb-4 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#aeb7b0]">Gestión administrativa</span>
            <span className="rounded-full border border-[#e3b65b]/20 bg-[#e3b65b]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#e3b65b]">Sesión activa</span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[#69736c]">Consulta y administra los registros del gimnasio mediante una sesión protegida.</p>
        </div>

        <div className="border-t border-white/[0.06] p-4">
          {logoutError && <p role="alert" className="mb-2 px-3 text-[10px] leading-4 text-[#f2a19b]">{logoutError}</p>}
          <button type="button" onClick={() => void signOut()} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold text-[#8f9992] transition hover:bg-white/[0.045] hover:text-white disabled:cursor-wait disabled:opacity-50">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.055]"><Icon name="arrow-up" size={16} /></span>
            {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      <div className="min-h-screen md:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-white/[0.06] bg-[#0b0d0c]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <button aria-label="Abrir menú" className="rounded-xl border border-white/[0.08] p-2.5 text-[#bdc5be] hover:bg-white/5 md:hidden" onClick={() => setMenuOpen(true)}>
              <Icon name="menu" />
            </button>
            <Link href="/usuarios" className="hidden h-10 w-[min(34vw,320px)] items-center gap-2.5 rounded-xl border border-white/[0.07] bg-[#111412] px-3.5 text-xs text-[#929b94] hover:text-white sm:flex"><Icon name="search" size={17} />Buscar usuarios</Link>
            <span className="text-xs font-medium text-[#68716a] sm:hidden">Panel administrativo</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link href="/membresias" aria-label="Consultar vencimientos de membresías" className="rounded-xl p-2.5 text-[#929c95] transition hover:bg-white/[0.05] hover:text-white"><Icon name="bell" size={18} /></Link>
            <div className="hidden h-8 w-px bg-white/[0.08] sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#c5f66c] to-[#6da822] text-xs font-black text-[#17200d]">FZ</div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-[#e1e7e2]">Administrador</p>
                <p className="mt-0.5 text-[10px] text-[#707a72]">FITZONE</p>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
