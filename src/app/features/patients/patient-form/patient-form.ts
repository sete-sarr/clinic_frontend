import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FieldTree, FormField, email, form, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { parseIsoDate, toIsoDate } from '../../../core/utils/date';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { BLOOD_TYPE_LABELS, BloodType, GENDER_LABELS, Gender, Patient, PatientPayload } from '../patient.model';
import { PatientService } from '../patient.service';

export interface PatientFormDialogData {
  id?: string;
}

interface PatientFormModel {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  date_of_birth: Date | null;
  gender: Gender | null;
  blood_type: BloodType;
  national_id: string;
}

@Component({
  selector: 'app-patient-form',
  imports: [
    FormField,
    MatButtonModule,
    MatDialogModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './patient-form.html',
  styleUrl: './patient-form.css',
})
export class PatientForm {
  private readonly patientService = inject(PatientService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<PatientForm>);
  private readonly data = inject<PatientFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly currentId = signal<string | undefined>(this.data?.id);

  protected readonly isEditMode = computed(() => this.currentId() !== undefined);
  protected readonly today = new Date();
  protected readonly genderOptions = Object.entries(GENDER_LABELS) as [Gender, string][];
  protected readonly bloodTypeOptions = Object.entries(BLOOD_TYPE_LABELS) as [BloodType, string][];

  protected readonly patientResource = httpResource<Patient | null>(
    () => (this.currentId() ? { url: `${environment.apiBaseUrl}/patients/${this.currentId()}/` } : undefined),
    { defaultValue: null },
  );

  protected readonly model = signal<PatientFormModel>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    date_of_birth: null,
    gender: null,
    blood_type: 'unknown',
    national_id: '',
  });

  protected readonly patientForm = form(this.model, (path) => {
    required(path.first_name, { message: 'Prénom requis' });
    required(path.last_name, { message: 'Nom requis' });
    required(path.phone, { message: 'Téléphone requis' });
    required(path.date_of_birth, { message: 'Date de naissance requise' });
    required(path.gender, { message: 'Genre requis' });
    email(path.email, { message: 'Adresse e-mail invalide' });
  });

  constructor() {
    effect(() => {
      const patient = this.patientResource.value();
      if (patient) {
        this.model.set({
          first_name: patient.first_name,
          last_name: patient.last_name,
          phone: patient.phone,
          email: patient.email,
          date_of_birth: parseIsoDate(patient.date_of_birth),
          gender: patient.gender,
          blood_type: patient.blood_type,
          national_id: patient.national_id,
        });
      }
    });
  }

  protected async onSubmit(): Promise<void> {
    await submit(this.patientForm, async () => {
      const value = this.model();
      const payload: PatientPayload = {
        first_name: value.first_name,
        last_name: value.last_name,
        phone: value.phone,
        email: value.email,
        date_of_birth: toIsoDate(value.date_of_birth!),
        gender: value.gender!,
        blood_type: value.blood_type,
        national_id: value.national_id,
      };

      try {
        const id = this.currentId();
        if (id) {
          await firstValueFrom(this.patientService.update(Number(id), payload));
        } else {
          await firstValueFrom(this.patientService.create(payload));
        }
        this.successNotifier.show('Patient enregistré avec succès.');
        this.dialogRef.close(true);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, "Impossible d'enregistrer le patient.");
        const fieldsByName = {
          first_name: this.patientForm.first_name,
          last_name: this.patientForm.last_name,
          phone: this.patientForm.phone,
          email: this.patientForm.email,
          date_of_birth: this.patientForm.date_of_birth,
          gender: this.patientForm.gender,
          blood_type: this.patientForm.blood_type,
          national_id: this.patientForm.national_id,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }
}
