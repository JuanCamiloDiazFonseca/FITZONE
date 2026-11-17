"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";

const API = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!API) { setError("No está configurada la conexión con FITZONE."); return; }
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true);
    try {
      const response = await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ name, email, password }), cache: "no-store" });
      if (!response.ok) {
        let message = "No se pudo crear la cuenta.";
        try { const body = await response.json() as { message?: string | string[] }; message = Array.isArray(body.message) ? body.message.join(" ") : body.message ?? message; } catch { /* generic message */ }
        throw new Error(message);
      }
      const login = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, credentials: "include", cache: "no-store", body: JSON.stringify({ email, password }) });
      if (!login.ok) throw new Error("Tu cuenta se creó. Inicia sesión para continuar.");
      router.replace("/cliente"); router.refresh();
    } catch (cause) { setError(cause instanceof TypeError ? "No se pudo conectar con FITZONE." : cause instanceof Error ? cause.message : "No se pudo crear la cuenta."); }
    finally { setBusy(false); }
  }
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0d0c] px-4 py-8 text-[#eef2ef]">
    <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-[-20%] h-[560px] w-[560px] rounded-full bg-[#b4f344]/[0.055] blur-[130px]" />
    <section className="relative w-full max-w-lg rounded-[28px] border border-white/[0.075] bg-[#101311] p-7 shadow-[0_35px_100px_rgba(0,0,0,0.45)] sm:p-10">
      <Link href="/" className="mb-8 flex w-fit items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b4f344] text-[#11150d]"><Icon name="dumbbell" size={23} /></span><span className="text-lg font-black tracking-[0.16em]">FIT<span className="text-[#b4f344]">ZONE</span></span></Link>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9cbc6c]">ÚNETE A FITZONE</p><h1 className="text-3xl font-bold tracking-tight">Crea tu cuenta</h1><p className="mt-2 text-sm text-[#929b94]">Consulta tu membresía y tus pagos desde tu espacio personal.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block text-xs font-semibold text-[#b5beb7]">Nombre completo<input name="name" required maxLength={160} autoComplete="name" className="mt-2 h-12 w-full rounded-xl border border-white/[0.08] bg-[#0d100e] px-4 text-sm text-white outline-none focus:border-[#b4f344]/40" /></label>
        <label className="block text-xs font-semibold text-[#b5beb7]">Correo electrónico<input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-2 h-12 w-full rounded-xl border border-white/[0.08] bg-[#0d100e] px-4 text-sm text-white outline-none focus:border-[#b4f344]/40" /></label>
        <label className="block text-xs font-semibold text-[#b5beb7]">Contraseña<input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className="mt-2 h-12 w-full rounded-xl border border-white/[0.08] bg-[#0d100e] px-4 text-sm text-white outline-none focus:border-[#b4f344]/40" /></label>
        <label className="block text-xs font-semibold text-[#b5beb7]">Confirmar contraseña<input name="confirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className="mt-2 h-12 w-full rounded-xl border border-white/[0.08] bg-[#0d100e] px-4 text-sm text-white outline-none focus:border-[#b4f344]/40" /></label>
        {error && <p role="alert" className="rounded-xl border border-[#f08b84]/20 bg-[#f08b84]/[0.06] p-3 text-xs leading-5 text-[#f2a19b]">{error}</p>}
        <button disabled={busy} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#b4f344] text-xs font-extrabold text-[#151a10] disabled:opacity-60">{busy ? "Creando cuenta…" : "Crear cuenta"}</button>
      </form>
      <p className="mt-6 text-center text-xs text-[#929b94]"><Link href="/login" className="font-bold text-[#b4f344] hover:text-[#d2ff87]">¿Ya tienes cuenta? Inicia sesión</Link></p>
    </section>
  </main>;
}
