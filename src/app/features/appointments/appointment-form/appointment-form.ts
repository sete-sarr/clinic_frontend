import { Component, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { DepartmentSummary } from '../../../core/models/department.model';
import { DoctorSummary } from '../../../core/models/doctor.model';
import { PatientSummary } from '../../../core/models/patient.model';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { parseIsoDate, toIsoDate } from '../../../core/utils/date';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { Appointment, AppointmentPayload } from '../appointment.model';
import { AppointmentService } from '../appointment.service';
import { apiResource } from '../../../core/api/api-resource';
import { FieldErrorState, revealFirstError } from '../../../shared/forms/form-errors';

export interface AppointmentFormDialogData {
  id?: string;
}

interface AppointmentFormModel {
  patient: number | null;
  department: number | null;
  doctor: number | null;
  date: Date | null;
  time: string;
  reason: string;
}

function formatPatient(patient: PatientSummary): string {
  return `${patient.first_name} ${patient.last_name} (${patient.patient_number})`;
}

function formatDoctor(doctor: DoctorSummary): string {
  const fullName = `${doctor.user.first_name} ${doctor.user.last_name}`.trim();
  return fullName || doctor.user.username;
}

@Component({
  selector: 'app-appointment-form',
  imports: [
    FieldErrorState,
    FormField,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  templateUrl: './appointment-form.html',
  styleUrl: './appointment-form.css',
})
export class AppointmentForm {
  private readonly appointmentService = inject(AppointmentService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<AppointmentForm>);
  private readonly data = inject<AppointmentFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly currentId = signal<string | undefined>(this.data?.id);

  protected readonly isEditMode = computed(() => this.currentId() !== undefined);
  protected readonly formatDoctor = formatDoctor;
  protected readonly today = new Date();

  protected readonly appointmentResource = apiResource<Appointment | null>(
    () => (this.currentId() ? { url: `${environment.apiBaseUrl}/appointments/${this.currentId()}/` } : undefined),
    { defaultValue: null },
  );

  protected readonly model = signal<AppointmentFormModel>({
    patient: null,
    department: null,
    doctor: null,
    date: null,
    time: '',
    reason: '',
  });

  protected readonly patientQuery = signal('');
  protected readonly patientLabel = signal('');

  protected readonly patientsResource = apiResource<Paginated<PatientSummary>>(
    () => ({
      url: `${environment.apiBaseUrl}/patients/`,
      params: { search: this.patientQuery(), page_size: 10 },
    }),
    { defaultValue: emptyPage<PatientSummary>() },
  );

  // Départements ouverts aux rendez-vous ; la liste des médecins se restreint au département choisi.
  protected readonly departmentsResource = apiResource<Paginated<DepartmentSummary>>(
    () => ({ url: `${environment.apiBaseUrl}/departments/`, params: { status: 'active', page_size: 100 } }),
    { defaultValue: emptyPage<DepartmentSummary>() },
  );

  protected readonly doctorsResource = apiResource<Paginated<DoctorSummary>>(
    () => ({
      url: `${environment.apiBaseUrl}/doctors/`,
      params: {
        page_size: 100,
        is_active: true,
        ...(this.model().department ? { department: this.model().department! } : {}),
      },
    }),
    { defaultValue: emptyPage<DoctorSummary>() },
  );

  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly appointmentForm = form(this.model, (path) => {
    required(path.patient, { message: translate('common.validation.patientRequired') });
    // Médecin facultatif quand un département est choisi : un médecin du département le prendra en charge.
    validate(path.doctor, ({ value, valueOf }) =>
      value() || valueOf(path.department)
        ? undefined
        : { kind: 'required', message: translate('appointments.doctorOrDepartmentRequired') },
    );
    required(path.date, { message: translate('common.validation.dateRequired') });
    required(path.time, { message: translate('common.validation.timeRequired') });
    maxLength(path.reason, 255, { message: translate('common.validation.max255') });
  });

  constructor() {
    effect(() => {
      const appointment = this.appointmentResource.value();
      if (appointment) {
        this.model.set({
          patient: appointment.patient,
          department: appointment.department,
          doctor: appointment.doctor,
          date: parseIsoDate(appointment.date),
          time: appointment.time.slice(0, 5),
          reason: appointment.reason,
        });
        this.patientLabel.set(appointment.patient_display);
      }
    });
  }

  protected onPatientQueryInput(value: string): void {
    this.patientQuery.set(value);
    this.patientLabel.set(value);
    this.appointmentForm.patient().value.set(null);
  }

  protected onPatientSelected(patient: PatientSummary): void {
    this.appointmentForm.patient().value.set(patient.id);
    this.patientLabel.set(formatPatient(patient));
  }

  protected onDepartmentChange(): void {
    // Le médecin choisi peut ne pas appartenir au nouveau département.
    this.appointmentForm.doctor().value.set(null);
  }

  protected formatPatientOption(patient: PatientSummary): string {
    return formatPatient(patient);
  }

  protected async onSubmit(): Promise<void> {
    revealFirstError(this.host, this.appointmentForm.patient());
    await submit(this.appointmentForm, async () => {
      const value = this.model();
      const payload: AppointmentPayload = {
        patient: value.patient!,
        doctor: value.doctor,
        department: value.department,
        date: toIsoDate(value.date!),
        time: value.time,
        reason: value.reason,
      };

      try {
        const id = this.currentId();
        if (id) {
          await firstValueFrom(this.appointmentService.update(Number(id), payload));
        } else {
          await firstValueFrom(this.appointmentService.create(payload));
        }
        this.successNotifier.show(translate('appointments.saved'));
        this.dialogRef.close(true);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('appointments.saveError'));
        const fieldsByName = {
          patient: this.appointmentForm.patient,
          department: this.appointmentForm.department,
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
