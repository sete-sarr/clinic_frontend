import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, maxLength, min, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { Medication } from '../../../core/models/pharmacy.model';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { MedicationService } from '../medication.service';

export interface MedicationFormDialogData {
  id?: string;
}

interface MedicationFormModel {
  name: string;
  unit: string;
  unit_price: number;
  min_threshold: number;
  max_threshold: number | null;
}

@Component({
  selector: 'app-medication-form',
  imports: [
    FormField,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './medication-form.html',
  styleUrl: './medication-form.css',
})
export class MedicationForm {
  private readonly medicationService = inject(MedicationService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<MedicationForm>);
  private readonly data = inject<MedicationFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly currentId = signal<string | undefined>(this.data?.id);
  protected readonly isEditMode = computed(() => this.currentId() !== undefined);

  protected readonly medicationResource = httpResource<Medication | null>(
    () => (this.currentId() ? { url: `${environment.apiBaseUrl}/pharmacy/medications/${this.currentId()}/` } : undefined),
    { defaultValue: null },
  );

  protected readonly isArchived = computed(() => this.medicationResource.value()?.is_active === false);

  protected readonly model = signal<MedicationFormModel>({
    name: '',
    unit: '',
    unit_price: 0,
    min_threshold: 0,
    max_threshold: null,
  });

  protected readonly medicationForm = form(this.model, (path) => {
    required(path.name, { message: 'Nom du médicament requis' });
    maxLength(path.name, 200, { message: 'Nom trop long (200 caractères maximum)' });
    required(path.unit, { message: 'Unité requise (ex. boîte, comprimé, flacon)' });
    maxLength(path.unit, 50, { message: 'Unité trop longue (50 caractères maximum)' });
    min(path.unit_price, 0, { message: 'Le prix ne peut pas être négatif' });
    min(path.min_threshold, 0, { message: 'Le seuil minimal ne peut pas être négatif' });
  });

  constructor() {
    effect(() => {
      const medication = this.medicationResource.value();
      if (medication) {
        this.model.set({
          name: medication.name,
          unit: medication.unit,
          unit_price: medication.unit_price,
          min_threshold: medication.min_threshold,
          max_threshold: medication.max_threshold,
        });
      }
    });
  }

  protected async onSubmit(): Promise<void> {
    await submit(this.medicationForm, async () => {
      const value = this.model();
      try {
        const id = this.currentId();
        if (id) {
          await firstValueFrom(this.medicationService.update(Number(id), value));
        } else {
          await firstValueFrom(this.medicationService.create(value));
        }
        this.successNotifier.show('Médicament enregistré avec succès.');
        this.dialogRef.close(true);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, "Impossible d'enregistrer ce médicament.");
        const fieldsByName = {
          name: this.medicationForm.name,
          unit: this.medicationForm.unit,
          unit_price: this.medicationForm.unit_price,
          min_threshold: this.medicationForm.min_threshold,
          max_threshold: this.medicationForm.max_threshold,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }
}
