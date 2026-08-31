import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { APPOINTMENT_STATUS_LABELS, Appointment } from '../../appointments/appointment.model';
import { PortalAppointmentForm } from './portal-appointment-form/portal-appointment-form';
import { PortalAppointmentService } from './portal-appointment.service';

// REST_FRAMEWORK PAGE_SIZE (backend/backend/settings.py) — the default pagination class doesn't
// expose a page_size query override, so this must match the server's actual page size exactly.
const PAGE_SIZE = 20;

// Display-only hint mirroring the backend's APPOINTMENT_CANCELLATION_DEADLINE_HOURS setting
// (backend/backend/settings.py) — the backend is authoritative; no endpoint exposes this value,
// so if that setting is ever tuned this copy needs a manual update too (docs/known-issues.md).
const CANCELLATION_DEADLINE_HOURS = 24;

@Component({
  selector: 'app-portal-appointments',
  imports: [
    EmptyState,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './portal-appointments.html',
  styleUrl: './portal-appointments.css',
})
export class PortalAppointments {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly portalAppointmentService = inject(PortalAppointmentService);

  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly statusLabels = APPOINTMENT_STATUS_LABELS;
  protected readonly cancellationDeadlineHours = CANCELLATION_DEADLINE_HOURS;

  protected readonly confirmingCancelId = signal<number | null>(null);
  protected readonly cancellingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  // Same endpoint the staff appointment-list uses — the backend already scopes it to "own
  // appointments only" for the patient role (patients/../get_queryset patient branch).
  protected readonly appointmentsResource = httpResource<Paginated<Appointment>>(
    () => ({
      url: `${environment.apiBaseUrl}/appointments/`,
      params: { page: this.page() },
    }),
    { defaultValue: emptyPage<Appointment>() },
  );

  protected readonly totalCount = computed(() => this.appointmentsResource.value().count);

  protected statusLabel(appointment: Appointment): string {
    return APPOINTMENT_STATUS_LABELS[appointment.status];
  }

  protected onPageChange(event: PageEvent): void {
    this.router.navigate([], { queryParams: { page: event.pageIndex + 1 }, queryParamsHandling: 'merge' });
  }

  protected openCreate(): void {
    const ref = this.dialog.open(PortalAppointmentForm, {
      width: '600px',
      maxWidth: '95vw',
      autoFocus: 'first-tabbable',
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.appointmentsResource.reload();
      }
    });
  }

  // Client-side hint only, purely to show/hide the Cancel button — the backend
  // (cancel_appointment_by_patient) is always the authoritative check on submit.
  protected isCancellable(appointment: Appointment): boolean {
    if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
      return false;
    }
    const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
    const deadline = new Date(Date.now() + this.cancellationDeadlineHours * 60 * 60 * 1000);
    return appointmentDate > deadline;
  }

  protected requestCancel(appointment: Appointment): void {
    this.errorMessage.set(null);
    this.confirmingCancelId.set(appointment.id);
  }

  protected dismissCancel(): void {
    this.confirmingCancelId.set(null);
  }

  protected confirmCancel(appointment: Appointment): void {
    this.cancellingId.set(appointment.id);
    this.portalAppointmentService.cancel(appointment.id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.confirmingCancelId.set(null);
        this.appointmentsResource.reload();
      },
      error: (error) => {
        this.cancellingId.set(null);
        this.confirmingCancelId.set(null);
        this.errorMessage.set(parseApiError(error, "Impossible d'annuler ce rendez-vous.").message);
      },
    });
  }
}
