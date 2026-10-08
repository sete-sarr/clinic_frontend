import { Component, computed, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, min, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { parseApiError } from '../../../core/api/api-error';
import { Medication, SaleUnit, isPackaged, unitsFor } from '../../../core/models/pharmacy.model';
import { toIsoDate } from '../../../core/utils/date';
import { MedicationService } from '../medication.service';
import { DEFAULT_CURRENCY, currencySymbol } from '../../../core/utils/money';
import { AuthService } from '../../../core/auth/auth.service';

export interface StockBatchFormDialogData {
  medication: Medication;
}

interface StockBatchFormModel {
  batch_number: string;
  expiry_date: Date | null;
  received_date: Date | null;
  quantity: number;
  received_in: SaleUnit;
  unit_cost: number;
  supplier: string;
}

@Component({
  selector: 'app-stock-batch-form',
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
  templateUrl: './stock-batch-form.html',
  styleUrl: './stock-batch-form.css',
})
export class StockBatchForm {
  // Prix saisis dans la devise actuelle de la clinique (docs/i18n.md §8).
  protected readonly currencySymbol = currencySymbol(inject(AuthService).user()?.clinic_currency ?? DEFAULT_CURRENCY);
  private readonly medicationService = inject(MedicationService);
  protected readonly dialogRef = inject(MatDialogRef<StockBatchForm>);
  protected readonly data = inject<StockBatchFormDialogData>(MAT_DIALOG_DATA);

  protected readonly medication = this.data.medication;
  protected readonly isPackaged = isPackaged(this.medication);

  protected readonly model = signal<StockBatchFormModel>({
    batch_number: '',
    expiry_date: null,
    received_date: new Date(),
    quantity: 1,
    // Produit conditionné : réception en boîtes par défaut (cas courant), en unités possible.
    received_in: isPackaged(this.data.medication) ? 'pack' : 'unit',
    unit_cost: 0,
    supplier: '',
  });

  protected readonly batchForm = form(this.model, (path) => {
    required(path.batch_number, { message: translate('pharmacy.batch.numberRequired') });
    required(path.expiry_date, { message: translate('pharmacy.batch.expiryRequired') });
    required(path.received_date, { message: translate('pharmacy.batch.receivedRequired') });
    required(path.quantity, { message: translate('pharmacy.batch.quantityRequired') });
    min(path.quantity, 1, { message: translate('pharmacy.batch.quantityMin') });
    min(path.unit_cost, 0, { message: translate('pharmacy.batch.costNotNegative') });
  });

  // Quantité convertie en unités de base, affichée sous la saisie.
  protected readonly unitsPreview = computed(() =>
    unitsFor(this.medication, Number(this.model().quantity) || 0, this.model().received_in),
  );

  protected async onSubmit(): Promise<void> {
    await submit(this.batchForm, async () => {
      const value = this.model();
      if (!value.expiry_date || !value.received_date) {
        return undefined;
      }
      try {
        await firstValueFrom(
          this.medicationService.receiveBatch({
            medication: this.medication.id,
            batch_number: value.batch_number,
            expiry_date: toIsoDate(value.expiry_date),
            received_date: toIsoDate(value.received_date),
            quantity: value.quantity,
            received_in: value.received_in,
            unit_cost: value.unit_cost,
            supplier: value.supplier,
          }),
        );
        this.dialogRef.close(true);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('pharmacy.batch.saveError'));
        const fieldsByName = {
          batch_number: this.batchForm.batch_number,
          expiry_date: this.batchForm.expiry_date,
          received_date: this.batchForm.received_date,
          quantity: this.batchForm.quantity,
          received_in: this.batchForm.received_in,
          unit_cost: this.batchForm.unit_cost,
          supplier: this.batchForm.supplier,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }
}
