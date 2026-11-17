export type MemberStatus = "Activa" | "Por vencer" | "Vencida";

export type Member = {
  name: string;
  email: string;
  initials: string;
  color: string;
  plan: string;
  status: MemberStatus;
  joined: string;
  expires: string;
};

export type PaymentStatus = "Completado" | "Pendiente" | "Reembolsado";

export const EXPIRATION_ALERT_WINDOW_DAYS = 5;

export type Payment = {
  member: string;
  initials: string;
  color: string;
  concept: string;
  date: string;
  method: string;
  amount: string;
  status: PaymentStatus;
};

export const members: Member[] = [
  { name: "Valentina Rojas", email: "valentina.rojas@email.test", initials: "VR", color: "from-rose-400 to-orange-300", plan: "Plan trimestral", status: "Activa", joined: "12 nov, 2026", expires: "12 feb, 2027" },
  { name: "Mateo Cárdenas", email: "mateo.cardenas@email.test", initials: "MC", color: "from-sky-400 to-indigo-400", plan: "Plan mensual", status: "Por vencer", joined: "10 oct, 2026", expires: "16 nov, 2026" },
  { name: "Isabella Méndez", email: "isabella.mendez@email.test", initials: "IM", color: "from-violet-400 to-fuchsia-400", plan: "Plan anual", status: "Activa", joined: "02 mar, 2026", expires: "02 mar, 2027" },
  { name: "Santiago López", email: "santiago.lopez@email.test", initials: "SL", color: "from-amber-300 to-red-400", plan: "Plan mensual", status: "Vencida", joined: "14 sep, 2026", expires: "14 oct, 2026" },
  { name: "Camila Torres", email: "camila.torres@email.test", initials: "CT", color: "from-emerald-300 to-teal-500", plan: "Plan semestral", status: "Activa", joined: "08 jun, 2026", expires: "08 dic, 2026" },
  { name: "Nicolás Herrera", email: "nicolas.herrera@email.test", initials: "NH", color: "from-blue-300 to-cyan-500", plan: "Plan trimestral", status: "Por vencer", joined: "18 ago, 2026", expires: "18 nov, 2026" },
];

export const payments: Payment[] = [
  { member: "Valentina Rojas", initials: "VR", color: "from-rose-400 to-orange-300", concept: "Renovación trimestral", date: "15 nov, 2026 · 09:42", method: "Tarjeta débito", amount: "$ 285.000", status: "Completado" },
  { member: "Isabella Méndez", initials: "IM", color: "from-violet-400 to-fuchsia-400", concept: "Plan anual", date: "15 nov, 2026 · 08:16", method: "Transferencia", amount: "$ 960.000", status: "Completado" },
  { member: "Camila Torres", initials: "CT", color: "from-emerald-300 to-teal-500", concept: "Plan semestral", date: "14 nov, 2026 · 18:31", method: "Efectivo", amount: "$ 540.000", status: "Completado" },
  { member: "Nicolás Herrera", initials: "NH", color: "from-blue-300 to-cyan-500", concept: "Renovación trimestral", date: "14 nov, 2026 · 14:03", method: "Tarjeta crédito", amount: "$ 285.000", status: "Pendiente" },
  { member: "Mateo Cárdenas", initials: "MC", color: "from-sky-400 to-indigo-400", concept: "Plan mensual", date: "13 nov, 2026 · 11:27", method: "Transferencia", amount: "$ 110.000", status: "Completado" },
  { member: "Santiago López", initials: "SL", color: "from-amber-300 to-red-400", concept: "Plan mensual", date: "12 nov, 2026 · 16:52", method: "Tarjeta débito", amount: "$ 110.000", status: "Reembolsado" },
];

export const membershipPlans = [
  { name: "Plan mensual", price: "$ 110.000", term: "30 días", members: "412 usuarios", accent: "#b4f344", completion: "78%" },
  { name: "Plan trimestral", price: "$ 285.000", term: "90 días", members: "286 usuarios", accent: "#67d7a3", completion: "64%" },
  { name: "Plan semestral", price: "$ 540.000", term: "180 días", members: "164 usuarios", accent: "#82aaff", completion: "51%" },
  { name: "Plan anual", price: "$ 960.000", term: "365 días", members: "84 usuarios", accent: "#c49bff", completion: "42%" },
];
