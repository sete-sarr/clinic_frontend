import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, maxLength, min, required, submit, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

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
    TranslocoPipe,
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
    required(path.name, { message: translate('pharmacy.nameRequired') });
    maxLength(path.name, 200, { message: translate('pharmacy.nameTooLong') });
    required(path.unit, { message: translate('pharmacy.unitRequired') });
    maxLength(path.unit, 50, { message: translate('pharmacy.unitTooLong') });
    min(path.unit_price, 0, { message: translate('pharmacy.priceNotNegative') });
    min(path.min_threshold, 0, { message: translate('pharmacy.minNotNegative') });
    // Reflète la contrainte medication_max_threshold_gte_min_threshold (pharmacy/models.py), revérifiée
    // côté serveur par MedicationSerializer.validate — ici uniquement pour un retour immédiat.
    validate(path.max_threshold, ({ value, valueOf }) => {
      const max = value();
      if (max === null || (max as unknown) === '') {
        return undefined;
      }
      if (max < 0) {
        return { kind: 'min', message: translate('pharmacy.maxNotNegative') };
      }
      return max < (valueOf(path.min_threshold) ?? 0)
        ? { kind: 'maxBelowMin', message: translate('pharmacy.maxBelowMin') }
        : undefined;
    });
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
        this.successNotifier.show(translate('pharmacy.saved'));
        this.dialogRef.close(true);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('pharmacy.saveError'));
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
