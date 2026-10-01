// Reflète reports.services.dashboard.dashboard_stats (GET /api/v1/reports/dashboard/) : une section
// vaut null quand le rôle de l'utilisateur n'y a pas accès (business/reporting-export-policy.md).
export interface DashboardStats {
  currency: string;
  appointments: {
    date_from: string;
    date_to: string;
    days: { date: string; completed: number; no_show: number; cancelled: number }[];
    totals: { completed: number; no_show: number; cancelled: number };
    no_show_rate: number | null;
  } | null;
  revenue: {
    date_from: string;
    date_to: string;
    months: { month: string; amount: string }[];
    total: string;
  } | null;
  invoices: {
    date_from: string;
    date_to: string;
    statuses: { status: 'paid' | 'pending_payment' | 'issued'; count: number; amount: string }[];
    balance_due: string;
  } | null;
}
