import { Component, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, min, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';

import { parseApiError } from '../../../core/api/api-error';
import { toIsoDate } from '../../../core/utils/date';
import { MedicationService } from '../medication.service';

export interface StockBatchFormDialogData {
  medicationId: number;
  medicationName: string;
}

interface StockBatchFormModel {
  batch_number: string;
  expiry_date: Date | null;
  received_date: Date | null;
  quantity_received: number;
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
  ],
  templateUrl: './stock-batch-form.html',
  styleUrl: './stock-batch-form.css',
})
export class StockBatchForm {
  private readonly medicationService = inject(MedicationService);
  protected readonly dialogRef = inject(MatDialogRef<StockBatchForm>);
  protected readonly data = inject<StockBatchFormDialogData>(MAT_DIALOG_DATA);

  protected readonly model = signal<StockBatchFormModel>({
    batch_number: '',
    expiry_date: null,
    received_date: new Date(),
    quantity_received: 1,
    unit_cost: 0,
    supplier: '',
  });

  protected readonly batchForm = form(this.model, (path) => {
    required(path.batch_number, { message: 'Numéro de lot requis' });
    required(path.expiry_date, { message: 'Date de péremption requise' });
    required(path.received_date, { message: 'Date de réception requise' });
    required(path.quantity_received, { message: 'Quantité requise' });
    min(path.quantity_received, 1, { message: 'La quantité doit être au moins 1' });
    min(path.unit_cost, 0, { message: 'Le coût ne peut pas être négatif' });
  });

  protected async onSubmit(): Promise<void> {
    await submit(this.batchForm, async () => {
      const value = this.model();
      if (!value.expiry_date || !value.received_date) {
        return undefined;
      }
      try {
        await firstValueFrom(
          this.medicationService.receiveBatch({
            medication: this.data.medicationId,
            batch_number: value.batch_number,
            expiry_date: toIsoDate(value.expiry_date),
            received_date: toIsoDate(value.received_date),
            quantity_received: value.quantity_received,
            unit_cost: value.unit_cost,
            supplier: value.supplier,
          }),
        );
        this.dialogRef.close(true);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, "Impossible d'enregistrer cette réception de stock.");
        const fieldsByName = {
          batch_number: this.batchForm.batch_number,
          expiry_date: this.batchForm.expiry_date,
          received_date: this.batchForm.received_date,
          quantity_received: this.batchForm.quantity_received,
          unit_cost: this.batchForm.unit_cost,
          supplier: this.batchForm.supplier,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }
}
