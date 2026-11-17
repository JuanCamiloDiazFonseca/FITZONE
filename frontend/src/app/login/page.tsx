"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");

async function readLoginError(response: Response): Promise<string> {
  if (response.status === 401) return "Correo o contraseña incorrectos.";
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(" ");
    if (body.message) return body.message;
  } catch {
    // Use the generic message when the response is not JSON.
  }
  return "No se pudo iniciar sesión. Inténtalo de nuevo.";
}

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!API_BASE_URL) {
      setError("Falta configurar NEXT_PUBLIC_API_BASE_URL en el frontend.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error(await readLoginError(response));
      const session = await response.json() as { role?: string };
      router.replace(session.role === "CUSTOMER" ? "/cliente" : "/");
      router.refresh();
    } catch (signInError) {
      setError(signInError instanceof TypeError
        ? "No se pudo conectar con NestJS. Verifica que el backend esté activo y que CORS permita el frontend."
        : signInError instanceof Error
          ? signInError.message
          : "No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0d0c] px-4 py-8 text-[#eef2ef] sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-[-20%] h-[560px] w-[560px] rounded-full bg-[#b4f344]/[0.055] blur-[130px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-64 right-[-10%] h-[600px] w-[600px] rounded-full bg-[#77ac34]/[0.045] blur-[140px]" />
      <div className="relative grid w-full max-w-[960px] overflow-hidden rounded-[28px] border border-white/[0.075] bg-[#101311] shadow-[0_35px_100px_rgba(0,0,0,0.45)] lg:min-h-[610px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-[radial-gradient(ellipse_at_24%_12%,rgba(180,243,68,0.13),transparent_42%),linear-gradient(145deg,#141a14,#101311_62%)] p-10 lg:flex xl:p-12">
          <div aria-hidden="true" className="absolute -bottom-20 -right-16 h-[330px] w-[330px] rounded-full border border-[#b4f344]/[0.08]" />
          <div aria-hidden="true" className="absolute -bottom-9 -right-5 h-[240px] w-[240px] rounded-full border border-[#b4f344]/[0.1]" />
          <div aria-hidden="true" className="absolute bottom-8 right-8 h-[150px] w-[150px] rounded-full border border-[#b4f344]/[0.12]" />
          <Link href="/" className="relative flex w-fit items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b4f344] text-[#11150d]"><Icon name="dumbbell" size={23} /></span>
            <span className="text-lg font-black tracking-[0.16em]">FIT<span className="text-[#b4f344]">ZONE</span></span>
          </Link>
          <div className="relative max-w-sm pb-8">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#b4f344]/15 bg-[#b4f344]/[0.07] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#b4f344]"><span className="h-1.5 w-1.5 rounded-full bg-[#b4f344]" />Controla. Crece. Entrena.</span>
            <h1 className="text-[42px] font-bold leading-[1.06] tracking-[-0.055em] text-[#f1f5f0] xl:text-[48px]">Todo tu gimnasio.<br /><span className="text-[#b4f344]">En movimiento.</span></h1>
            <p className="mt-5 max-w-[350px] text-[13px] leading-6 text-[#8b968d]">Administra usuarios, membresías y pagos desde una sola experiencia diseñada para tu equipo.</p>
            <div className="mt-9 flex items-center gap-3">
              <div className="flex -space-x-2"><span className="h-8 w-8 rounded-full border-2 border-[#131813] bg-gradient-to-br from-orange-300 to-rose-400" /><span className="h-8 w-8 rounded-full border-2 border-[#131813] bg-gradient-to-br from-sky-300 to-blue-500" /><span className="h-8 w-8 rounded-full border-2 border-[#131813] bg-gradient-to-br from-emerald-300 to-teal-500" /></div>
              <span className="text-[10px] font-medium text-[#818d83]">Una vista clara de tu operación</span>
            </div>
          </div>
          <p className="relative text-[9px] font-medium tracking-wide text-[#5f6a61]">FITZONE · GESTIÓN DE GIMNASIO</p>
        </section>

        <section className="flex flex-col justify-center p-7 sm:p-10 lg:px-12 xl:px-14">
          <Link href="/" className="mb-10 flex w-fit items-center gap-2 text-[10px] font-semibold text-[#778178] transition hover:text-[#c5cec6] lg:hidden"><Icon name="dumbbell" size={18} className="text-[#b4f344]" /> FITZONE</Link>
          <div className="mb-8">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9cbc6c]">BIENVENIDO A FITZONE</p>
            <h2 className="text-[26px] font-bold tracking-[-0.04em] text-[#f0f4f0]">Qué bueno verte</h2>
            <p className="mt-2 text-[12px] text-[#818b83]">Ingresa tus datos para continuar al panel.</p>
          </div>

          <form className="space-y-5" onSubmit={signIn}>
            <label className="block">
              <span className="mb-2 block text-[10px] font-semibold text-[#b5beb7]">Correo electrónico</span>
              <span className="flex h-12 items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0d100e] px-3.5 transition focus-within:border-[#b4f344]/40 focus-within:ring-2 focus-within:ring-[#b4f344]/[0.08]">
                <Icon name="users" size={16} className="text-[#68736a]" /><input name="email" type="email" required autoComplete="username" placeholder="nombre@fitzone.com" disabled={submitting} className="w-full bg-transparent text-xs text-[#eef2ef] outline-none placeholder:text-[#505a52] disabled:opacity-60" />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-[10px] font-semibold text-[#b5beb7]">Contraseña</span>
              <span className="flex h-12 items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0d100e] px-3.5 transition focus-within:border-[#b4f344]/40 focus-within:ring-2 focus-within:ring-[#b4f344]/[0.08]">
                <Icon name="card" size={16} className="text-[#68736a]" /><input name="password" type="password" required minLength={8} maxLength={72} autoComplete="current-password" placeholder="Ingresa tu contraseña" disabled={submitting} className="w-full bg-transparent text-xs text-[#eef2ef] outline-none placeholder:text-[#505a52] disabled:opacity-60" />
              </span>
            </label>
            <div className="flex items-center justify-between text-[10px]">
              <label className="flex cursor-pointer items-center gap-2 text-[#89938b]"><input type="checkbox" className="h-3.5 w-3.5 accent-[#b4f344]" />Recordarme</label>
              <button type="button" className="font-semibold text-[#b4f344] hover:text-[#d2ff87]">¿Olvidaste tu contraseña?</button>
            </div>
            <button type="submit" disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#b4f344] text-[11px] font-extrabold text-[#151a10] shadow-[0_8px_24px_rgba(180,243,68,0.12)] transition hover:bg-[#c3fa62] disabled:cursor-wait disabled:opacity-60">{submitting ? "Validando…" : "Iniciar sesión"} <Icon name="chevron" size={15} /></button>
            {error && <p role="alert" className="rounded-xl border border-[#f08b84]/20 bg-[#f08b84]/[0.06] px-3 py-2.5 text-[10px] leading-5 text-[#f2a19b]">{error}</p>}
          </form>
          <p className="mt-5 text-center text-xs text-[#929b94]"><Link href="/registro" className="font-bold text-[#b4f344] hover:text-[#d2ff87]">¿No tienes cuenta? Regístrate aquí</Link></p>
          <div className="my-7 flex items-center gap-3"><span className="h-px flex-1 bg-white/[0.06]" /><span className="text-[9px] uppercase tracking-[0.13em] text-[#59635b]">Acceso seguro</span><span className="h-px flex-1 bg-white/[0.06]" /></div>
          <div className="flex items-start gap-2 rounded-xl border border-white/[0.055] bg-white/[0.02] p-3.5"><Icon name="check" size={15} className="mt-0.5 shrink-0 text-[#b4f344]" /><p className="text-[9px] leading-5 text-[#748077]">La sesión administrativa se conserva en una cookie protegida y no accesible desde JavaScript.</p></div>
          <p className="mt-8 text-center text-[9px] text-[#586259]">© 2026 FITZONE · Sistema de gestión de gimnasio</p>
        </section>
      </div>
    </main>
  );
}
