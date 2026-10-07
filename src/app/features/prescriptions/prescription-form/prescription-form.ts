import { Component, LOCALE_ID, computed, effect, inject, signal } from '@angular/core';
import {
  FieldTree,
  FormField,
  applyEach,
  disabled,
  form,
  min,
  required,
  schema,
  submit,
} from '@angular/forms/signals';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { Consultation } from '../../consultations/consultation.model';
import { DoctorSummary } from '../../../core/models/doctor.model';
import { PatientSummary } from '../../../core/models/patient.model';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import {
  LOCKED_PRESCRIPTION_STATUSES,
  PRESCRIPTION_STATUS_LABELS,
  Prescription,
  PrescriptionItem,
  PrescriptionPayload,
} from '../prescription.model';
import { PrescriptionService } from '../prescription.service';
import { apiResource } from '../../../core/api/api-resource';

export interface PrescriptionFormDialogData {
  id?: string;
}

interface PrescriptionFormModel {
  patient: number | null;
  doctor: number | null;
  consultation: number | null;
  notes: string;
  items: PrescriptionItem[];
}

function emptyItem(): PrescriptionItem {
  return { medication_name: '', dosage: '', frequency: '', duration: '', quantity: 1, instructions: '' };
}

function formatPatient(patient: PatientSummary): string {
  return `${patient.first_name} ${patient.last_name} (${patient.patient_number})`;
}

function formatDoctor(doctor: DoctorSummary): string {
  const fullName = `${doctor.user.first_name} ${doctor.user.last_name}`.trim();
  return fullName || doctor.user.username;
}

const itemSchema = schema<PrescriptionItem>((item) => {
  required(item.medication_name, { message: translate('prescriptions.medicationRequired') });
  required(item.dosage, { message: translate('prescriptions.dosageRequired') });
  required(item.frequency, { message: translate('prescriptions.frequencyRequired') });
  required(item.duration, { message: translate('prescriptions.durationRequired') });
  required(item.quantity, { message: translate('prescriptions.quantityRequired') });
  min(item.quantity, 1, { message: translate('prescriptions.quantityMin') });
});

@Component({
  selector: 'app-prescription-form',
  imports: [
    FormField,
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    TranslocoPipe,
  ],
  templateUrl: './prescription-form.html',
  styleUrl: './prescription-form.css',
})
export class PrescriptionForm {
  private readonly locale = inject(LOCALE_ID);
  private readonly prescriptionService = inject(PrescriptionService);
  private readonly auth = inject(AuthService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<PrescriptionForm>);
  private readonly data = inject<PrescriptionFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly currentId = signal<string | undefined>(this.data?.id);

  protected readonly isEditMode = computed(() => this.currentId() !== undefined);
  protected readonly formatDoctor = formatDoctor;
  protected readonly statusLabels = PRESCRIPTION_STATUS_LABELS;

  // Un médecin prescrit toujours sous son propre nom (backend/prescriptions/api/views.py
  // PrescriptionViewSet.perform_create écrase le champ doctor quelle que soit la valeur soumise),
  // donc le sélecteur n'a de sens que pour clinic_admin, qui peut agir au nom de n'importe quel médecin.
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

  protected readonly prescriptionResource = apiResource<Prescription | null>(
    () => (this.currentId() ? { url: `${environment.apiBaseUrl}/prescriptions/${this.currentId()}/` } : undefined),
    { defaultValue: null },
  );

  protected readonly currentStatus = computed(() => this.prescriptionResource.value()?.status ?? 'draft');
  protected readonly isLocked = computed(() => LOCKED_PRESCRIPTION_STATUSES.has(this.currentStatus()));

  protected readonly model = signal<PrescriptionFormModel>({
    patient: null,
    doctor: null,
    consultation: null,
    notes: '',
    items: [emptyItem()],
  });

  protected readonly patientQuery = signal('');
  protected readonly patientLabel = signal('');
  protected readonly selectedPatientId = signal<number | null>(null);

  protected readonly patientsResource = apiResource<Paginated<PatientSummary>>(
    () => ({
      url: `${environment.apiBaseUrl}/patients/`,
      params: { search: this.patientQuery(), page_size: 10 },
    }),
    { defaultValue: emptyPage<PatientSummary>() },
  );

  protected readonly doctorsResource = apiResource<Paginated<DoctorSummary>>(
    () => ({ url: `${environment.apiBaseUrl}/doctors/`, params: { page_size: 100 } }),
    { defaultValue: emptyPage<DoctorSummary>() },
  );

  // Récupéré uniquement en mode création — en mode édition, le lien vers la consultation est immuable (voir disabled() ci-dessous).
  protected readonly consultationsResource = apiResource<Paginated<Consultation>>(
    () =>
      this.selectedPatientId()
        ? {
            url: `${environment.apiBaseUrl}/consultations/`,
            params: { patient: this.selectedPatientId()!, page_size: 50 },
          }
        : undefined,
    { defaultValue: emptyPage<Consultation>() },
  );

  protected readonly prescriptionForm = form(this.model, (path) => {
    disabled(path, () => this.isLocked());
    // Le lien vers la consultation est en relation un-à-un et défini uniquement à la création (prescriptions/services.py
    // rejette le rattachement d'une prescription à une consultation déjà utilisée) — jamais modifiable ensuite.
    disabled(path.patient, () => this.isEditMode());
    disabled(path.consultation, () => this.isEditMode());
    required(path.patient, { message: translate('common.validation.patientRequired') });
    required(path.doctor, { message: translate('common.validation.doctorRequired') });
    required(path.consultation, { message: translate('prescriptions.consultationRequired') });
    applyEach(path.items, itemSchema);
  });

  constructor() {
    if (this.isSelfDoctor()) {
      this.model.update((value) => ({ ...value, doctor: this.ownDoctorId() }));
    }

    effect(() => {
      const prescription = this.prescriptionResource.value();
      if (prescription) {
        this.model.set({
          patient: prescription.patient,
          doctor: prescription.doctor,
          consultation: prescription.consultation,
          notes: prescription.notes,
          items: prescription.items.length > 0 ? prescription.items : [emptyItem()],
        });
        this.patientLabel.set(prescription.patient_display);
        this.selectedPatientId.set(prescription.patient);
      }
    });
  }

  protected onPatientQueryInput(value: string): void {
    this.patientQuery.set(value);
    this.patientLabel.set(value);
    this.prescriptionForm.patient().value.set(null);
    this.prescriptionForm.consultation().value.set(null);
    this.selectedPatientId.set(null);
  }

  protected onPatientSelected(patient: PatientSummary): void {
    this.prescriptionForm.patient().value.set(patient.id);
    this.patientLabel.set(formatPatient(patient));
    this.selectedPatientId.set(patient.id);
  }

  protected formatPatientOption(patient: PatientSummary): string {
    return formatPatient(patient);
  }

  protected formatConsultationOption(consultation: Consultation): string {
    const complaint = consultation.chief_complaint.slice(0, 40) || translate('prescriptions.noComplaint');
    return `${new Date(consultation.date).toLocaleString(this.locale)} — ${complaint}`;
  }

  protected addItem(): void {
    this.model.update((current) => ({ ...current, items: [...current.items, emptyItem()] }));
  }

  protected removeItem(index: number): void {
    this.model.update((current) => ({
      ...current,
      items: current.items.filter((_, i) => i !== index),
    }));
  }

  protected async onSubmit(): Promise<void> {
    await submit(this.prescriptionForm, async () => {
      const value = this.model();
      const payload: PrescriptionPayload = {
        consultation: value.consultation!,
        patient: value.patient!,
        doctor: value.doctor!,
        notes: value.notes,
        items: value.items.map(({ id: _itemId, ...item }) => item),
      };

      try {
        const id = this.currentId();
        if (id) {
          await firstValueFrom(this.prescriptionService.update(Number(id), payload));
          this.successNotifier.show(translate('prescriptions.updated'));
          this.dialogRef.close(true);
        } else {
          const created = await firstValueFrom(this.prescriptionService.create(payload));
          this.currentId.set(String(created.id));
          this.prescriptionResource.reload();
          this.successNotifier.show(translate('prescriptions.created'));
        }
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('prescriptions.saveError'));
        const fieldsByName = {
          patient: this.prescriptionForm.patient,
          doctor: this.prescriptionForm.doctor,
          consultation: this.prescriptionForm.consultation,
          notes: this.prescriptionForm.notes,
          items: this.prescriptionForm.items,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }

  protected validate(): void {
    const id = this.currentId();
    if (!id) {
      return;
    }
    const confirmed = confirm(translate('prescriptions.confirmFinalize'));
    if (!confirmed) {
      return;
    }
    this.prescriptionService
      .setStatus(Number(id), 'validated')
      .subscribe(() => this.prescriptionResource.reload());
  }

  protected cancel(): void {
    const id = this.currentId();
    if (!id) {
      return;
    }
    const confirmed = confirm(translate('prescriptions.confirmCancel'));
    if (!confirmed) {
      return;
    }
    this.prescriptionService
      .setStatus(Number(id), 'cancelled')
      .subscribe(() => this.prescriptionResource.reload());
  }

  protected downloadPdf(): void {
    const id = this.currentId();
    if (!id) {
      return;
    }
    this.prescriptionService.downloadPdf(Number(id)).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }
}
