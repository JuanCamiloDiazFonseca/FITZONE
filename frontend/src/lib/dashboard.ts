export type DashboardData = {
  generatedAt: string; timeZone: string; alertWindowDays: number;
  metrics: { totalUsers: number; activeMemberships: number; upcomingMemberships: number; expiredMemberships: number; totalRevenue: string; currentMonthRevenue: string; newUsersThisMonth: number | null; usersWithoutRegistrationDate: number | null; registrationDatesAvailable: boolean };
  comparison: { previousMonthRevenue: string; percentage: string | null; basis: string };
  revenueByMonth: { month: string; amount: string; payments: number }[];
  expiringMemberships: { id: string; userName: string; planType: string; expirationDate: string }[];
  users: { id: string; name: string; email: string; membership: { id: string; planType: string; expirationDate: string; status: string } | null }[];
  recentPayments: { id: string; userName: string; planType: string; amount: string; paidAt: string; method: string }[];
};
export const plans: Record<string, string> = { MONTHLY: "Mensual", QUARTERLY: "Trimestral", SEMIANNUAL: "Semestral", ANNUAL: "Anual" };
export const statuses: Record<string, string> = { ACTIVE: "Activa", UPCOMING: "Por vencer", EXPIRED: "Vencida", CANCELLED: "Cancelada" };
export const methods: Record<string, string> = { CASH: "Efectivo", CARD: "Tarjeta", BANK_TRANSFER: "Transferencia", OTHER: "Otro" };
export const cop = (amount: string | number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount));
export const localDate = (value: string) => new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
export const monthLabel = (month: string) => new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", month: "short", year: "2-digit" }).format(new Date(`${month}-15T12:00:00Z`));
