import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { KpiCard } from '../../shared/components/kpi-card/kpi-card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { environment } from '../../../environments/environment';
import { APPOINTMENT_STATUS_LABELS, Appointment } from '../appointments/appointment.model';
import { AuthService } from '../../core/auth/auth.service';
import { Paginated, emptyPage } from '../../core/models/pagination.model';
import { parseIsoDate, toIsoDate } from '../../core/utils/date';
import { AUDIT_ACTION_LABELS, AuditLogEntry, auditModelLabel } from '../audit-log/audit-log.model';
import { LanguageService } from '../../core/i18n/language.service';
import { formatMoney } from '../../core/utils/money';
import { BarChart } from '../../shared/components/charts/bar-chart/bar-chart';
import { ChartSeries, DonutSegment } from '../../shared/components/charts/chart.model';
import { DonutChart } from '../../shared/components/charts/donut-chart/donut-chart';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { DashboardStats } from './dashboard-stats.model';
import { apiResource } from '../../core/api/api-resource';

@Component({
  selector: 'app-dashboard',
  imports: [
    BarChart,
    DatePipe,
    DonutChart,
    EmptyState,
    RouterLink,
    MatButtonModule,
    KpiCard,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  protected readonly auth = inject(AuthService);

  private readonly today = toIsoDate(new Date());

  protected readonly statusLabels = APPOINTMENT_STATUS_LABELS;
  protected readonly isClinicAdmin = computed(() => this.auth.hasRole('clinic_admin'));

  // design-system/dashboard.md : « éviter les requêtes API inutiles » — chaque statistique ci-dessous ne se déclenche
  // que pour les rôles qui voient réellement ce KPI, et ne lit page_size:1 que lorsque seul le compte importe.
  private readonly seesSchedule = computed(() => this.auth.hasRole('doctor', 'secretary', 'clinic_admin'));
  private readonly seesClinicalQueue = computed(() => this.auth.hasRole('doctor', 'clinic_admin'));
  private readonly seesBilling = computed(() =>
    this.auth.hasRole('secretary', 'accountant', 'clinic_admin', 'doctor'),
  );

  protected readonly todaysAppointments = apiResource<Paginated<Appointment>>(
    () =>
      this.seesSchedule()
        ? { url: `${environment.apiBaseUrl}/appointments/`, params: { date: this.today, page_size: 5 } }
        : undefined,
    { defaultValue: emptyPage<Appointment>() },
  );

  protected readonly draftConsultations = apiResource<Paginated<unknown>>(
    () =>
      this.seesClinicalQueue()
        ? { url: `${environment.apiBaseUrl}/consultations/`, params: { status: 'draft', page_size: 1 } }
        : undefined,
    { defaultValue: emptyPage<unknown>() },
  );

  protected readonly draftPrescriptions = apiResource<Paginated<unknown>>(
    () =>
      this.seesClinicalQueue()
        ? { url: `${environment.apiBaseUrl}/prescriptions/`, params: { status: 'draft', page_size: 1 } }
        : undefined,
    { defaultValue: emptyPage<unknown>() },
  );

  private readonly issuedInvoices = apiResource<Paginated<unknown>>(
    () =>
      this.seesBilling()
        ? { url: `${environment.apiBaseUrl}/billing/`, params: { status: 'issued', page_size: 1 } }
        : undefined,
    { defaultValue: emptyPage<unknown>() },
  );

  private readonly pendingPaymentInvoices = apiResource<Paginated<unknown>>(
    () =>
      this.seesBilling()
        ? { url: `${environment.apiBaseUrl}/billing/`, params: { status: 'pending_payment', page_size: 1 } }
        : undefined,
    { defaultValue: emptyPage<unknown>() },
  );

  protected readonly unpaidInvoicesCount = computed(
    () => this.issuedInvoices.value().count + this.pendingPaymentInvoices.value().count,
  );

  protected readonly unpaidLoading = computed(
    () => this.issuedInvoices.isLoading() || this.pendingPaymentInvoices.isLoading(),
  );

  // Widget "Activité récente" — reprend le pattern de resource de l'audit-log de
  // features/audit-log/audit-log-list/audit-log-list.ts. AuditLogViewSet (backend/common/api/views.py)
  // est réservé à clinic_admin selon business/access-policy.md, donc ceci doit rester derrière isClinicAdmin().
  protected readonly actionLabels = AUDIT_ACTION_LABELS;
  protected readonly modelLabel = auditModelLabel;

  // ---- Graphiques (reports/services/dashboard.py) ----------------------------------------------
  // Une seule requête agrégée côté serveur ; chaque section n'existe que pour les rôles autorisés.
  private readonly language = inject(LanguageService).current();
  protected readonly seesCharts = computed(() =>
    this.auth.hasRole('clinic_admin', 'secretary', 'doctor', 'accountant'),
  );
  protected readonly stats = apiResource<DashboardStats | null>(
    () => (this.seesCharts() ? { url: `${environment.apiBaseUrl}/reports/dashboard/` } : undefined),
    { defaultValue: null },
  );

  private readonly dayAxis = new Intl.DateTimeFormat(this.language, { day: 'numeric', month: 'short' });
  private readonly dayTitle = new Intl.DateTimeFormat(this.language, { weekday: 'long', day: 'numeric', month: 'long' });
  private readonly monthAxis = new Intl.DateTimeFormat(this.language, { month: 'short' });
  private readonly monthTitle = new Intl.DateTimeFormat(this.language, { month: 'long', year: 'numeric' });
  private readonly compact = new Intl.NumberFormat(this.language, { notation: 'compact', maximumFractionDigits: 1 });
  private readonly percent = new Intl.NumberFormat(this.language, { style: 'percent', maximumFractionDigits: 1 });

  protected readonly countFormat = (value: number) => String(value);
  protected readonly compactFormat = (value: number) => this.compact.format(value);
  protected readonly moneyFormat = (value: number) => formatMoney(value, this.stats.value()?.currency, this.language);

  protected readonly appointmentsChart = computed(() => {
    const data = this.stats.value()?.appointments;
    if (!data) {
      return null;
    }
    const dates = data.days.map((day) => parseIsoDate(day.date));
    const series: ChartSeries[] = [
      { key: 'completed', label: translate('dashboard.charts.completed'), color: 'var(--chart-blue)', values: data.days.map((d) => d.completed) },
      { key: 'no_show', label: translate('dashboard.charts.noShow'), color: 'var(--chart-amber)', values: data.days.map((d) => d.no_show) },
      { key: 'cancelled', label: translate('dashboard.charts.cancelled'), color: 'var(--chart-muted)', values: data.days.map((d) => d.cancelled) },
    ];
    return {
      categories: dates.map((date) => this.dayAxis.format(date)),
      titles: dates.map((date) => capitalize(this.dayTitle.format(date))),
      series,
      completed: data.totals.completed,
      noShowRate: data.no_show_rate === null ? null : this.percent.format(data.no_show_rate),
    };
  });

  protected readonly revenueChart = computed(() => {
    const data = this.stats.value()?.revenue;
    if (!data) {
      return null;
    }
    const months = data.months.map((entry) => parseIsoDate(`${entry.month}-01`));
    const amounts = data.months.map((entry) => Number(entry.amount));
    return {
      categories: months.map((date) => capitalize(this.monthAxis.format(date))),
      titles: months.map((date) => capitalize(this.monthTitle.format(date))),
      series: [{ key: 'revenue', label: translate('dashboard.charts.revenueSeries'), color: 'var(--chart-blue)', values: amounts }],
      total: this.moneyFormat(Number(data.total)),
      thisMonth: this.moneyFormat(amounts[amounts.length - 1] ?? 0),
    };
  });

  protected readonly invoicesChart = computed(() => {
    const data = this.stats.value()?.invoices;
    if (!data) {
      return null;
    }
    const style: Record<string, { label: string; color: string }> = {
      paid: { label: 'dashboard.charts.invoicesPaid', color: 'var(--chart-teal)' },
      pending_payment: { label: 'dashboard.charts.invoicesPartial', color: 'var(--chart-blue)' },
      issued: { label: 'dashboard.charts.invoicesIssued', color: 'var(--chart-amber)' },
    };
    const segments: DonutSegment[] = data.statuses.map((entry) => ({
      key: entry.status,
      label: translate(style[entry.status].label),
      color: style[entry.status].color,
      value: entry.count,
      detail: this.moneyFormat(Number(entry.amount)),
    }));
    return { segments, balanceDue: this.moneyFormat(Number(data.balance_due)) };
  });

  protected readonly recentActivity = apiResource<Paginated<AuditLogEntry>>(
    () =>
      this.isClinicAdmin()
        ? { url: `${environment.apiBaseUrl}/audit-log/`, params: { page_size: 8 } }
        : undefined,
    { defaultValue: emptyPage<AuditLogEntry>() },
  );

  // patient_display est une simple chaîne "Prénom Nom (patient_number)" (AppointmentSerializer) — aucun
  // objet patient imbriqué ni photo n'existe, donc la carte planning utilise des initiales générées à la place.
  protected patientInitials(appointment: Appointment): string {
    const namePart = appointment.patient_display.split('(')[0].trim();
    const words = namePart.split(/\s+/).filter(Boolean);
    return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase();
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
