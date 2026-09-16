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

// REST_FRAMEWORK PAGE_SIZE (backend/backend/settings.py) — la classe de pagination par défaut n'expose
// pas de surcharge de page_size via un paramètre de requête, donc ceci doit correspondre exactement à la taille de page réelle du serveur.
const PAGE_SIZE = 20;

// Indication purement d'affichage reflétant le paramètre backend APPOINTMENT_CANCELLATION_DEADLINE_HOURS
// (backend/backend/settings.py) — le backend fait autorité ; aucun endpoint n'expose cette valeur,
// donc si ce paramètre est un jour modifié, cette copie doit aussi être mise à jour manuellement (docs/known-issues.md).
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

  // Même endpoint que celui utilisé par la liste des rendez-vous du personnel — le backend le restreint déjà
  // aux "rendez-vous personnels uniquement" pour le rôle patient (patients/../get_queryset, branche patient).
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

  // Simple indication côté client, uniquement pour afficher/masquer le bouton Annuler — le backend
  // (cancel_appointment_by_patient) reste toujours la vérification faisant autorité à la soumission.
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
