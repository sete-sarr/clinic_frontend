import { NgTemplateOutlet } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, booleanAttribute, computed, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { openBlobInNewTab, triggerBlobDownload } from '../../../core/utils/file-download';
import { toIsoDate } from '../../../core/utils/date';
import {
  APPOINTMENT_STATUS_LABELS,
  Appointment,
  AppointmentStatus,
  TERMINAL_APPOINTMENT_STATUSES,
} from '../appointment.model';
import { AppointmentForm } from '../appointment-form/appointment-form';
import { AppointmentService } from '../appointment.service';
import { RecordCard } from '../../../shared/components/record-card/record-card';
import { RecordCardData, statusTone } from '../../../shared/components/record-card/record-card.model';
import { injectIsHandset } from '../../../core/utils/handset';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-appointment-list',
  imports: [
    NgTemplateOutlet,
    RecordCard,
    EmptyState,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    TranslocoPipe,
  ],
  templateUrl: './appointment-list.html',
  styleUrl: './appointment-list.css',
})
export class AppointmentList {
  protected readonly isHandset = injectIsHandset();

  protected cardFor(appointment: Appointment): RecordCardData {
    return {
      title: appointment.patient_display,
      subtitle: appointment.doctor_display,
      icon: 'event',
      status: { label: this.statusLabel(appointment), tone: statusTone(appointment.status) },
      fields: [
        { label: translate('appointments.dateTime'), value: `${appointment.date} · ${appointment.time}` },
        ...(this.isCheckedIn(appointment)
          ? [{ label: translate('appointments.checkedInLabel'), value: appointment.ticket_number }]
          : []),
      ],
    };
  }

  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly appointmentService = inject(AppointmentService);
  protected readonly auth = inject(AuthService);


  // Entrées liées au routeur (withComponentInputBinding) : chaque query param alimente l'entrée de
  // MÊME NOM — d'où `patientNumber` / `checkedIn` dans l'URL (et non patient_number / checked_in,
  // noms des paramètres de l'API). Les query params absents sont mis à `undefined`, donc `page`
  // retombe via sa transformation plutôt que via la valeur par défaut déclarée.
  readonly status = input<AppointmentStatus | undefined>();
  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });
  readonly patientNumber = input<string | undefined>();
  // Query param texte ('true') : converti en booléen, absent = pas de filtre.
  readonly checkedIn = input<boolean | undefined, unknown>(undefined, {
    transform: (value: unknown) => (value === undefined || value === null || value === '' ? undefined : booleanAttribute(value)),
  });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly today = toIsoDate(new Date());
  protected readonly statusOptions = Object.entries(APPOINTMENT_STATUS_LABELS) as [
    AppointmentStatus,
    string,
  ][];
  protected readonly displayedColumns = ['date', 'patient', 'doctor', 'status', 'actions'];

  protected readonly patientNumberInput = signal('');
  private patientNumberDebounceHandle?: ReturnType<typeof setTimeout>;

  protected readonly appointmentsResource = httpResource<Paginated<Appointment>>(
    () => ({
      url: `${environment.apiBaseUrl}/appointments/`,
      params: {
        page: this.page(),
        ...(this.status() ? { status: this.status()! } : {}),
        ...(this.patientNumber() ? { patient_number: this.patientNumber()! } : {}),
        ...(this.checkedIn() !== undefined ? { checked_in: this.checkedIn()! } : {}),
      },
    }),
    { defaultValue: emptyPage<Appointment>() },
  );

  protected readonly dataSource = new MatTableDataSource<Appointment>([]);
  protected readonly totalCount = computed(() => this.appointmentsResource.value().count);

  protected readonly canManage = computed(() => this.auth.hasRole('doctor', 'secretary', 'clinic_admin'));

  constructor() {
    effect(() => {
      this.dataSource.data = this.appointmentsResource.value().results;
    });
    effect(() => {
      this.patientNumberInput.set(this.patientNumber() ?? '');
    });
  }

  protected isTerminal(appointment: Appointment): boolean {
    return TERMINAL_APPOINTMENT_STATUSES.has(appointment.status);
  }

  protected statusLabel(appointment: Appointment): string {
    return APPOINTMENT_STATUS_LABELS[appointment.status];
  }

  protected onStatusFilterChange(status: AppointmentStatus | ''): void {
    this.router.navigate([], { queryParams: { status: status || null, page: null }, queryParamsHandling: 'merge' });
  }

  protected onPatientNumberInput(value: string): void {
    this.patientNumberInput.set(value);
    clearTimeout(this.patientNumberDebounceHandle);
    this.patientNumberDebounceHandle = setTimeout(() => {
      this.router.navigate([], {
        queryParams: { patientNumber: value || null, page: null },
        queryParamsHandling: 'merge',
      });
    }, SEARCH_DEBOUNCE_MS);
  }

  protected onCheckedInFilterChange(checked: boolean): void {
    this.router.navigate([], {
      queryParams: { checkedIn: checked ? 'true' : null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected onPageChange(event: PageEvent): void {
    this.router.navigate([], { queryParams: { page: event.pageIndex + 1 }, queryParamsHandling: 'merge' });
  }

  protected openCreate(): void {
    if (!this.canManage()) {
      return;
    }
    const ref = this.dialog.open(AppointmentForm, { width: '720px', maxWidth: '95vw', autoFocus: 'first-tabbable' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.appointmentsResource.reload();
      }
    });
  }

  protected openEdit(appointment: Appointment): void {
    if (!this.canManage()) {
      return;
    }
    const ref = this.dialog.open(AppointmentForm, {
      width: '720px',
      maxWidth: '95vw',
      data: { id: String(appointment.id) },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.appointmentsResource.reload();
      }
    });
  }

  protected isCheckedIn(appointment: Appointment): boolean {
    return appointment.checked_in_at !== null;
  }

  protected canCheckIn(appointment: Appointment): boolean {
    return (
      !this.isCheckedIn(appointment) &&
      !this.isTerminal(appointment) &&
      appointment.date === this.today
    );
  }

  protected checkIn(appointment: Appointment): void {
    this.appointmentService.checkIn(appointment.id).subscribe(() => this.appointmentsResource.reload());
  }

  protected downloadTicket(appointment: Appointment): void {
    this.appointmentService.downloadTicketPdf(appointment.id).subscribe((blob) => openBlobInNewTab(blob));
  }

  protected confirm(appointment: Appointment): void {
    this.appointmentService
      .setStatus(appointment.id, 'confirmed')
      .subscribe(() => this.appointmentsResource.reload());
  }

  protected cancel(appointment: Appointment): void {
    this.appointmentService
      .setStatus(appointment.id, 'cancelled')
      .subscribe(() => this.appointmentsResource.reload());
  }

  protected complete(appointment: Appointment): void {
    this.appointmentService
      .setStatus(appointment.id, 'completed')
      .subscribe(() => this.appointmentsResource.reload());
  }

  protected markNoShow(appointment: Appointment): void {
    this.appointmentService
      .setStatus(appointment.id, 'no_show')
      .subscribe(() => this.appointmentsResource.reload());
  }

  protected exportCsv(): void {
    this.appointmentService.exportCsv().subscribe((blob) => triggerBlobDownload(blob, translate('exports.appointments')));
  }
}
