import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { MedicalRecord, MedicalRecordPayload } from '../medical-record.model';
import { MedicalRecordService } from '../medical-record.service';

export interface MedicalRecordFormDialogData {
  id: string;
}

interface MedicalRecordFormModel {
  allergies: string;
  medical_history: string;
  observations: string;
}

@Component({
  selector: 'app-medical-record-form',
  imports: [
    FormField,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './medical-record-form.html',
  styleUrl: './medical-record-form.css',
})
export class MedicalRecordForm {
  private readonly medicalRecordService = inject(MedicalRecordService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<MedicalRecordForm>);
  private readonly data = inject<MedicalRecordFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly currentId = signal<string | undefined>(this.data?.id);

  protected readonly recordResource = httpResource<MedicalRecord | null>(
    () => (this.currentId() ? { url: `${environment.apiBaseUrl}/medical-records/${this.currentId()}/` } : undefined),
    { defaultValue: null },
  );

  protected readonly patientLabel = computed(() => this.recordResource.value()?.patient_display ?? '');

  protected readonly model = signal<MedicalRecordFormModel>({
    allergies: '',
    medical_history: '',
    observations: '',
  });

  protected readonly medicalRecordForm = form(this.model);

  constructor() {
    effect(() => {
      const record = this.recordResource.value();
      if (record) {
        this.model.set({
          allergies: record.allergies,
          medical_history: record.medical_history,
          observations: record.observations,
        });
      }
    });
  }

  protected async onSubmit(): Promise<void> {
    await submit(this.medicalRecordForm, async () => {
      const payload: MedicalRecordPayload = this.model();

      try {
        await firstValueFrom(this.medicalRecordService.update(Number(this.currentId()), payload));
        this.successNotifier.show('Dossier médical enregistré avec succès.');
        this.dialogRef.close(true);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, "Impossible d'enregistrer le dossier médical.");
        const fieldsByName = {
          allergies: this.medicalRecordForm.allergies,
          medical_history: this.medicalRecordForm.medical_history,
          observations: this.medicalRecordForm.observations,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }
}
