import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe, translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { apiResource } from '../../../core/api/api-resource';
import { parseApiError } from '../../../core/api/api-error';
import { DoctorSummary } from '../../../core/models/doctor.model';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { Appointment } from '../appointment.model';
import { AppointmentService } from '../appointment.service';

// Accueil / administrateur : attribue un rendez-vous à un médecin, le réattribue, ou le remet à la
// disposition du département (appointments/services.py::assign_appointment). Les médecins proposés
// sont ceux du département du rendez-vous. Se ferme sur le rendez-vous mis à jour.
@Component({
  selector: 'app-appointment-assign-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  templateUrl: './appointment-assign-dialog.html',
  styleUrl: './appointment-assign-dialog.css',
})
export class AppointmentAssignDialog {
  private readonly appointmentService = inject(AppointmentService);
  protected readonly dialogRef = inject(MatDialogRef<AppointmentAssignDialog, Appointment>);
  protected readonly appointment = inject<Appointment>(MAT_DIALOG_DATA);

  protected readonly doctor = signal<number | null>(this.appointment.doctor);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly doctorsResource = apiResource<Paginated<DoctorSummary>>(
    () => ({
      url: `${environment.apiBaseUrl}/doctors/`,
      params: {
        page_size: 100,
        is_active: true,
        ...(this.appointment.department ? { department: this.appointment.department } : {}),
      },
    }),
    { defaultValue: emptyPage<DoctorSummary>() },
  );

  protected formatDoctor(doctor: DoctorSummary): string {
    return `${doctor.user.first_name} ${doctor.user.last_name}`.trim() || doctor.user.username;
  }

  protected async onSubmit(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      const updated = await firstValueFrom(this.appointmentService.assign(this.appointment.id, this.doctor()));
      this.dialogRef.close(updated);
    } catch (error) {
      this.error.set(parseApiError(error, translate('appointments.assignError')).message);
    } finally {
      this.saving.set(false);
    }
  }
}
