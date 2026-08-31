import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FieldTree, FormField, disabled, form, required, submit } from '@angular/forms/signals';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { DoctorSummary } from '../../../core/models/doctor.model';
import { PatientSummary } from '../../../core/models/patient.model';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import {
  CONSULTATION_STATUS_LABELS,
  Consultation,
  ConsultationPayload,
  LOCKED_CONSULTATION_STATUSES,
} from '../consultation.model';
import { ConsultationService } from '../consultation.service';

export interface ConsultationFormDialogData {
  id?: string;
}

interface ConsultationFormModel {
  patient: number | null;
  doctor: number | null;
  date: Date | null;
  time: string;
  is_follow_up: boolean;
  chief_complaint: string;
  diagnosis: string;
  treatment_plan: string;
}

function toIsoDateTime(date: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes).toISOString();
}

function splitDateTime(value: string): { date: Date; time: string } {
  const parsed = new Date(value);
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return { date: parsed, time: `${hours}:${minutes}` };
}

function formatPatient(patient: PatientSummary): string {
  return `${patient.first_name} ${patient.last_name} (${patient.patient_number})`;
}

function formatDoctor(doctor: DoctorSummary): string {
  const fullName = `${doctor.user.first_name} ${doctor.user.last_name}`.trim();
  return fullName || doctor.user.username;
}

@Component({
  selector: 'app-consultation-form',
  imports: [
    FormField,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './consultation-form.html',
  styleUrl: './consultation-form.css',
})
export class ConsultationForm {
  private readonly consultationService = inject(ConsultationService);
  private readonly auth = inject(AuthService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<ConsultationForm>);
  private readonly data = inject<ConsultationFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly currentId = signal<string | undefined>(this.data?.id);

  protected readonly isEditMode = computed(() => this.currentId() !== undefined);
  protected readonly formatDoctor = formatDoctor;
  protected readonly statusLabels = CONSULTATION_STATUS_LABELS;

  // A doctor always creates/owns their own consultations (backend/consultations/api/views.py
  // ConsultationViewSet.perform_create overrides the doctor field regardless of what's submitted),
  // so the picker only makes sense for clinic_admin, who can act on behalf of any doctor.
  protected readonly ownDoctorId = computed(() => this.auth.user()?.doctor_id ?? null);
  protected readonly isSelfDoctor = computed(
    () => this.auth.hasRole('doctor') && !this.auth.hasRole('clinic_admin') && this.ownDoctorId() !== null,
  );
  protected readonly currentUserName = computed(() => {
    const user = this.auth.user();
    if (!user) {
      return '';
    }
    return `${user.first_name} ${user.last_name}`.trim() || user.username;
  });

  protected readonly consultationResource = httpResource<Consultation | null>(
    () => (this.currentId() ? { url: `${environment.apiBaseUrl}/consultations/${this.currentId()}/` } : undefined),
    { defaultValue: null },
  );

  protected readonly currentStatus = computed(() => this.consultationResource.value()?.status ?? 'draft');
  protected readonly isLocked = computed(() => LOCKED_CONSULTATION_STATUSES.has(this.currentStatus()));

  protected readonly model = signal<ConsultationFormModel>({
    patient: null,
    doctor: null,
    date: null,
    time: '',
    is_follow_up: false,
    chief_complaint: '',
    diagnosis: '',
    treatment_plan: '',
  });

  // consultations/services.py only requires chief_complaint/diagnosis/treatment_plan when
  // completing (not on draft creation) — mirrored here to gate the "Terminer" action, not `required()`.
  protected readonly canComplete = computed(() => {
    const value = this.model();
    return !!(value.chief_complaint && value.diagnosis && value.treatment_plan);
  });

  protected readonly patientQuery = signal('');
  protected readonly patientLabel = signal('');

  protected readonly patientsResource = httpResource<Paginated<PatientSummary>>(
    () => ({
      url: `${environment.apiBaseUrl}/patients/`,
      params: { search: this.patientQuery(), page_size: 10 },
    }),
    { defaultValue: emptyPage<PatientSummary>() },
  );

  protected readonly doctorsResource = httpResource<Paginated<DoctorSummary>>(
    () => ({ url: `${environment.apiBaseUrl}/doctors/`, params: { page_size: 100 } }),
    { defaultValue: emptyPage<DoctorSummary>() },
  );

  protected readonly consultationForm = form(this.model, (path) => {
    // Signal Forms' own disabled() propagates to every descendant field — including Material
    // components' own `disabled` input via [formField] — so a validated (locked) consultation
    // is genuinely read-only, not just visually so (docs/security.md: never frontend-only, but
    // the UI should still reflect backend-enforced immutability accurately).
    disabled(path, () => this.isLocked());
    required(path.patient, { message: 'Patient requis' });
    required(path.doctor, { message: 'Médecin requis' });
    required(path.date, { message: 'Date requise' });
    required(path.time, { message: 'Heure requise' });
  });

  constructor() {
    if (this.isSelfDoctor()) {
      this.model.update((value) => ({ ...value, doctor: this.ownDoctorId() }));
    }

    effect(() => {
      const consultation = this.consultationResource.value();
      if (consultation) {
        const { date, time } = splitDateTime(consultation.date);
        this.model.set({
          patient: consultation.patient,
          doctor: consultation.doctor,
          date,
          time,
          is_follow_up: consultation.is_follow_up,
          chief_complaint: consultation.chief_complaint,
          diagnosis: consultation.diagnosis,
          treatment_plan: consultation.treatment_plan,
        });
        this.patientLabel.set(consultation.patient_display);
      }
    });
  }

  protected onPatientQueryInput(value: string): void {
    this.patientQuery.set(value);
    this.patientLabel.set(value);
    this.consultationForm.patient().value.set(null);
  }

  protected onPatientSelected(patient: PatientSummary): void {
    this.consultationForm.patient().value.set(patient.id);
    this.patientLabel.set(formatPatient(patient));
  }

  protected formatPatientOption(patient: PatientSummary): string {
    return formatPatient(patient);
  }

  protected async onSubmit(): Promise<void> {
    await submit(this.consultationForm, async () => {
      const value = this.model();
      const payload: ConsultationPayload = {
        patient: value.patient!,
        doctor: value.doctor!,
        appointment: this.consultationResource.value()?.appointment ?? null,
        date: toIsoDateTime(value.date!, value.time),
        is_follow_up: value.is_follow_up,
        chief_complaint: value.chief_complaint,
        diagnosis: value.diagnosis,
        treatment_plan: value.treatment_plan,
      };

      try {
        const id = this.currentId();
        if (id) {
          await firstValueFrom(this.consultationService.update(Number(id), payload));
          this.successNotifier.show('Consultation mise à jour avec succès.');
          this.dialogRef.close(true);
        } else {
          const created = await firstValueFrom(this.consultationService.create(payload));
          this.currentId.set(String(created.id));
          this.consultationResource.reload();
          this.successNotifier.show('Consultation créée avec succès.');
        }
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, "Impossible d'enregistrer la consultation.");
        const fieldsByName = {
          patient: this.consultationForm.patient,
          doctor: this.consultationForm.doctor,
          date: this.consultationForm.date,
          chief_complaint: this.consultationForm.chief_complaint,
          diagnosis: this.consultationForm.diagnosis,
          treatment_plan: this.consultationForm.treatment_plan,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }

  protected complete(): void {
    const id = this.currentId();
    if (!id) {
      return;
    }
    this.consultationService.setStatus(Number(id), 'completed').subscribe(() => this.consultationResource.reload());
  }

  protected validate(): void {
    const id = this.currentId();
    if (!id) {
      return;
    }
    const confirmed = confirm('Valider verrouille définitivement cette consultation. Continuer ?');
    if (!confirmed) {
      return;
    }
    this.consultationService.setStatus(Number(id), 'validated').subscribe(() => this.consultationResource.reload());
  }
}
