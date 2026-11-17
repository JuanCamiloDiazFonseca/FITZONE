import type { ReactNode } from "react";
import type { MemberStatus, PaymentStatus } from "@/data/demo-data";
import { Icon, type IconName } from "@/components/icon";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9cbc6c]">{eyebrow}</p>
        <h1 className="text-[26px] font-bold tracking-[-0.045em] text-[#f0f4f0] sm:text-[32px]">{title}</h1>
        <p className="mt-2 max-w-xl text-[13px] leading-6 text-[#818b83]">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function DemoTag({ className = "" }: { className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#e3b65b]/20 bg-[#e3b65b]/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.13em] text-[#e3b65b] ${className}`}><span className="h-1 w-1 rounded-full bg-current" />Datos de prueba</span>;
}

export function ActionButton({ children, secondary = false, icon }: { children: ReactNode; secondary?: boolean; icon?: IconName }) {
  return (
    <button type="button" className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition ${secondary ? "border border-white/[0.09] bg-white/[0.025] text-[#c4ccc5] hover:bg-white/[0.07]" : "bg-[#b4f344] text-[#141a0e] shadow-[0_5px_20px_rgba(180,243,68,0.1)] hover:bg-[#c1fa5b]"}`}>
      {icon && <Icon name={icon} size={15} />}{children}
    </button>
  );
}

export function StatCard({ label, value, change, trend = "up", icon, note }: { label: string; value: string; change: string; trend?: "up" | "down" | "neutral"; icon: IconName; note: string }) {
  const tone = trend === "up" ? "text-[#b4f344]" : trend === "down" ? "text-[#f08b84]" : "text-[#9aa39c]";
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/[0.065] bg-[#111412] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:border-white/[0.11] sm:p-5">
      <div className="absolute -right-5 -top-7 h-24 w-24 rounded-full bg-[#b4f344]/[0.035] blur-2xl transition group-hover:bg-[#b4f344]/[0.07]" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-[#929b94]">{label}</p>
          <p className="mt-3 text-[26px] font-bold tracking-[-0.05em] text-[#f1f4f1] sm:text-[29px]">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#b4f344]/10 bg-[#b4f344]/[0.07] text-[#b4f344]"><Icon name={icon} size={18} /></span>
      </div>
      <div className="relative mt-4 flex items-center gap-2 border-t border-white/[0.055] pt-3.5">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${tone}`}>
          {trend === "down" ? <Icon name="arrow-down" size={12} /> : trend === "up" ? <Icon name="arrow-up" size={12} /> : null}{change}
        </span>
        <span className="text-[10px] text-[#68716a]">{note}</span>
      </div>
    </article>
  );
}

export function Panel({ title, subtitle, action, children, className = "" }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/[0.065] bg-[#111412] ${className}`}>
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.055] px-5 py-4 sm:px-6">
        <div><h2 className="text-[13px] font-bold text-[#e4eae5]">{title}</h2>{subtitle && <p className="mt-1 text-[10px] text-[#727c74]">{subtitle}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Avatar({ initials, color, size = "normal" }: { initials: string; color: string; size?: "normal" | "small" }) {
  return <span className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} font-extrabold text-[#131713] shadow-inner ${size === "small" ? "h-8 w-8 text-[9px]" : "h-9 w-9 text-[10px]"}`}>{initials}</span>;
}

export function MemberBadge({ status }: { status: MemberStatus }) {
  const styles: Record<MemberStatus, string> = {
    Activa: "border-[#b4f344]/15 bg-[#b4f344]/[0.08] text-[#b4f344]",
    "Por vencer": "border-[#e3b65b]/15 bg-[#e3b65b]/[0.08] text-[#e3b65b]",
    Vencida: "border-[#ed817b]/15 bg-[#ed817b]/[0.08] text-[#ed817b]",
  };
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-bold ${styles[status]}`}><span className="h-1 w-1 rounded-full bg-current" />{status}</span>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    Completado: "border-[#b4f344]/15 bg-[#b4f344]/[0.08] text-[#b4f344]",
    Pendiente: "border-[#e3b65b]/15 bg-[#e3b65b]/[0.08] text-[#e3b65b]",
    Reembolsado: "border-[#88aaff]/15 bg-[#88aaff]/[0.08] text-[#88aaff]",
  };
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-bold ${styles[status]}`}><span className="h-1 w-1 rounded-full bg-current" />{status}</span>;
}

export function TableWrap({ children, minWidth = "700px" }: { children: ReactNode; minWidth?: string }) {
  return <div className="soft-scrollbar overflow-x-auto"><table className="w-full text-left" style={{ minWidth }}>{children}</table></div>;
}

export function TableHead({ columns }: { columns: string[] }) {
  return <thead><tr className="border-b border-white/[0.055]">{columns.map((column) => <th key={column} className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-[0.13em] text-[#68726a] sm:px-6">{column}</th>)}</tr></thead>;
}

export function EmptyActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}
