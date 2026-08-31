import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { environment } from '../../../environments/environment';
import { APPOINTMENT_STATUS_LABELS, Appointment } from '../appointments/appointment.model';
import { AuthService } from '../../core/auth/auth.service';
import { parseApiError } from '../../core/api/api-error';
import { Clinic, PLAN_TIER_LABELS, SUBSCRIPTION_STATUS_LABELS } from '../../core/models/clinic.model';
import { Paginated, emptyPage } from '../../core/models/pagination.model';
import { toIsoDate } from '../../core/utils/date';
import { AUDIT_ACTION_LABELS, AuditLogEntry } from '../audit-log/audit-log.model';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { SubscriptionService } from '../subscription/subscription.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe,
    EmptyState,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  protected readonly auth = inject(AuthService);
  private readonly subscriptionService = inject(SubscriptionService);

  private readonly today = toIsoDate(new Date());

  protected readonly planTierLabels = PLAN_TIER_LABELS;
  protected readonly subscriptionStatusLabels = SUBSCRIPTION_STATUS_LABELS;
  protected readonly statusLabels = APPOINTMENT_STATUS_LABELS;
  protected readonly isClinicAdmin = computed(() => this.auth.hasRole('clinic_admin'));
  protected readonly openingPortal = signal(false);
  protected readonly portalError = signal<string | null>(null);

  protected readonly clinicResource = httpResource<Clinic | null>(
    () =>
      this.isClinicAdmin() && this.auth.user()?.clinic
        ? { url: `${environment.apiBaseUrl}/clinics/${this.auth.user()?.clinic}/` }
        : undefined,
    { defaultValue: null },
  );

  protected openBillingPortal(): void {
    this.portalError.set(null);
    this.openingPortal.set(true);
    this.subscriptionService.openBillingPortal().subscribe({
      next: (result) => {
        window.location.href = result.portal_url;
      },
      error: (error) => {
        this.openingPortal.set(false);
        this.portalError.set(parseApiError(error, "Impossible d'ouvrir la gestion de l'abonnement.").message);
      },
    });
  }

  // design-system/dashboard.md: "avoid unnecessary API requests" — each stat below only fires
  // for the roles that actually see that KPI, and only reads page_size:1 where just the count matters.
  private readonly seesSchedule = computed(() => this.auth.hasRole('doctor', 'secretary', 'clinic_admin'));
  private readonly seesClinicalQueue = computed(() => this.auth.hasRole('doctor', 'clinic_admin'));
  private readonly seesBilling = computed(() =>
    this.auth.hasRole('secretary', 'accountant', 'clinic_admin', 'doctor'),
  );

  protected readonly todaysAppointments = httpResource<Paginated<Appointment>>(
    () =>
      this.seesSchedule()
        ? { url: `${environment.apiBaseUrl}/appointments/`, params: { date: this.today, page_size: 5 } }
        : undefined,
    { defaultValue: emptyPage<Appointment>() },
  );

  protected readonly draftConsultations = httpResource<Paginated<unknown>>(
    () =>
      this.seesClinicalQueue()
        ? { url: `${environment.apiBaseUrl}/consultations/`, params: { status: 'draft', page_size: 1 } }
        : undefined,
    { defaultValue: emptyPage<unknown>() },
  );

  protected readonly draftPrescriptions = httpResource<Paginated<unknown>>(
    () =>
      this.seesClinicalQueue()
        ? { url: `${environment.apiBaseUrl}/prescriptions/`, params: { status: 'draft', page_size: 1 } }
        : undefined,
    { defaultValue: emptyPage<unknown>() },
  );

  private readonly issuedInvoices = httpResource<Paginated<unknown>>(
    () =>
      this.seesBilling()
        ? { url: `${environment.apiBaseUrl}/billing/`, params: { status: 'issued', page_size: 1 } }
        : undefined,
    { defaultValue: emptyPage<unknown>() },
  );

  private readonly pendingPaymentInvoices = httpResource<Paginated<unknown>>(
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

  // "Activité récente" widget — reuses the audit-log resource pattern from
  // features/audit-log/audit-log-list/audit-log-list.ts. AuditLogViewSet (backend/common/api/views.py)
  // is clinic_admin-only per business/access-policy.md, so this must stay behind isClinicAdmin().
  protected readonly actionLabels = AUDIT_ACTION_LABELS;

  protected readonly recentActivity = httpResource<Paginated<AuditLogEntry>>(
    () =>
      this.isClinicAdmin()
        ? { url: `${environment.apiBaseUrl}/audit-log/`, params: { page_size: 5 } }
        : undefined,
    { defaultValue: emptyPage<AuditLogEntry>() },
  );

  // patient_display is a plain "First Last (patient_number)" string (AppointmentSerializer) — no
  // nested patient object/photo exists, so the schedule card uses generated initials instead.
  protected patientInitials(appointment: Appointment): string {
    const namePart = appointment.patient_display.split('(')[0].trim();
    const words = namePart.split(/\s+/).filter(Boolean);
    return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase();
  }
}
