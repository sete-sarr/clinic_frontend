import { httpResource } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { environment } from '../../../../../environments/environment';
import { parseApiError } from '../../../../core/api/api-error';
import { DoctorSummary } from '../../../../core/models/doctor.model';
import { Paginated, emptyPage } from '../../../../core/models/pagination.model';
import { toIsoDate } from '../../../../core/utils/date';
import { SuccessNotifier } from '../../../../shared/notifications/success-notifier';
import { PortalAppointmentPayload } from '../portal-appointment.model';
import { PortalAppointmentService } from '../portal-appointment.service';

interface PortalAppointmentFormModel {
  doctor: number | null;
  date: Date | null;
  time: string;
  reason: string;
}

function formatDoctor(doctor: DoctorSummary): string {
  const fullName = `${doctor.user.first_name} ${doctor.user.last_name}`.trim();
  return fullName || doctor.user.username;
}

@Component({
  selector: 'app-portal-appointment-form',
  imports: [
    FormField,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  templateUrl: './portal-appointment-form.html',
  styleUrl: './portal-appointment-form.css',
})
export class PortalAppointmentForm {
  private readonly portalAppointmentService = inject(PortalAppointmentService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<PortalAppointmentForm>);

  protected readonly formatDoctor = formatDoctor;
  protected readonly today = new Date();

  protected readonly doctorsResource = httpResource<Paginated<DoctorSummary>>(
    () => ({ url: `${environment.apiBaseUrl}/doctors/`, params: { page_size: 100 } }),
    { defaultValue: emptyPage<DoctorSummary>() },
  );

  protected readonly model = signal<PortalAppointmentFormModel>({
    doctor: null,
    date: null,
    time: '',
    reason: '',
  });

  protected readonly appointmentForm = form(this.model, (path) => {
    required(path.doctor, { message: translate('common.validation.doctorRequired') });
    required(path.date, { message: translate('common.validation.dateRequired') });
    required(path.time, { message: translate('common.validation.timeRequired') });
    maxLength(path.reason, 255, { message: translate('common.validation.max255') });
  });

  protected async onSubmit(): Promise<void> {
    await submit(this.appointmentForm, async () => {
      const value = this.model();
      const payload: PortalAppointmentPayload = {
        doctor: value.doctor!,
        date: toIsoDate(value.date!),
        time: value.time,
        reason: value.reason,
      };

      try {
        await firstValueFrom(this.portalAppointmentService.create(payload));
        this.successNotifier.show(translate('portal.appointments.requested'));
        this.dialogRef.close(true);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('portal.appointments.bookError'));
        const fieldsByName = {
          doctor: this.appointmentForm.doctor,
          date: this.appointmentForm.date,
          time: this.appointmentForm.time,
          reason: this.appointmentForm.reason,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }
}
