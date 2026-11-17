"use client";
import { useSyncExternalStore } from "react";
function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 1000);
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => { window.clearInterval(timer); window.removeEventListener("focus", onChange); document.removeEventListener("visibilitychange", onChange); };
}
const snapshot = () => Math.floor(Date.now() / 60000) * 60000;
const serverSnapshot = () => null;
export function ColombiaClock() {
  // The stable server snapshot prevents hydration differences across time zones.
  const time = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  if (time === null) return <p className="text-[10px] text-[#9cbc6c]">Fecha y hora de Colombia…</p>;
  const day = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(time);
  const hour = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(time);
  return <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9cbc6c]"><time dateTime={new Date(time).toISOString()}>{day} · {hour}</time> · Colombia</p>;
}
