import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
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
import { firstValueFrom } from 'rxjs';

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
  required(item.medication_name, { message: 'Nom du médicament requis' });
  required(item.dosage, { message: 'Dosage requis' });
  required(item.frequency, { message: 'Fréquence requise' });
  required(item.duration, { message: 'Durée requise' });
  required(item.quantity, { message: 'Quantité requise' });
  min(item.quantity, 1, { message: 'Quantité minimale : 1' });
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
  ],
  templateUrl: './prescription-form.html',
  styleUrl: './prescription-form.css',
})
export class PrescriptionForm {
  private readonly prescriptionService = inject(PrescriptionService);
  private readonly auth = inject(AuthService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<PrescriptionForm>);
  private readonly data = inject<PrescriptionFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly currentId = signal<string | undefined>(this.data?.id);

  protected readonly isEditMode = computed(() => this.currentId() !== undefined);
  protected readonly formatDoctor = formatDoctor;
  protected readonly statusLabels = PRESCRIPTION_STATUS_LABELS;

  // A doctor always prescribes under their own name (backend/prescriptions/api/views.py
  // PrescriptionViewSet.perform_create overrides the doctor field regardless of what's submitted),
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

  protected readonly prescriptionResource = httpResource<Prescription | null>(
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

  // Only fetched for create mode — in edit mode the consultation link is immutable (see disabled() below).
  protected readonly consultationsResource = httpResource<Paginated<Consultation>>(
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
    // The consultation link is one-to-one and set at creation only (prescriptions/services.py
    // rejects re-pointing a prescription at an already-used consultation) — never editable after.
    disabled(path.patient, () => this.isEditMode());
    disabled(path.consultation, () => this.isEditMode());
    required(path.patient, { message: 'Patient requis' });
    required(path.doctor, { message: 'Médecin requis' });
    required(path.consultation, { message: 'Consultation requise' });
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
    const complaint = consultation.chief_complaint.slice(0, 40) || 'Sans motif renseigné';
    return `${new Date(consultation.date).toLocaleString()} — ${complaint}`;
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
          this.successNotifier.show('Prescription mise à jour avec succès.');
          this.dialogRef.close(true);
        } else {
          const created = await firstValueFrom(this.prescriptionService.create(payload));
          this.currentId.set(String(created.id));
          this.prescriptionResource.reload();
          this.successNotifier.show('Prescription créée avec succès.');
        }
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, "Impossible d'enregistrer la prescription.");
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
    const confirmed = confirm('Valider verrouille définitivement cette prescription. Continuer ?');
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
    const confirmed = confirm('Annuler cette prescription ? Cette action est définitive.');
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
