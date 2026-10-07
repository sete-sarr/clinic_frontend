import { Component, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { parseApiError } from '../../../core/api/api-error';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { LabOrder, LabOrderItem } from '../laboratory.model';
import { LaboratoryService } from '../laboratory.service';

export interface LabResultCorrectionData {
  orderId: number;
  item: LabOrderItem;
}

// Correction d'un résultat déjà validé : jamais une modification, un nouveau résultat motivé qui
// remplace l'ancien, conservé dans l'historique et audité (docs/laboratory.md §8).
@Component({
  selector: 'app-lab-result-correction',
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
  templateUrl: './lab-result-correction.html',
  styleUrl: '../laboratory-form.css',
})
export class LabResultCorrection {
  private readonly laboratoryService = inject(LaboratoryService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<LabResultCorrection, LabOrder>);
  protected readonly data = inject<LabResultCorrectionData>(MAT_DIALOG_DATA);

  protected readonly model = signal({ value: this.data.item.result?.value ?? '', comment: '', reason: '' });

  protected readonly correctionForm = form(this.model, (path) => {
    required(path.value, { message: translate('laboratory.valueRequired') });
    maxLength(path.value, 100, { message: translate('laboratory.valueTooLong') });
    required(path.reason, { message: translate('laboratory.reasonRequired') });
  });

  protected async onSubmit(): Promise<void> {
    await submit(this.correctionForm, async () => {
      try {
        const order = await firstValueFrom(
          this.laboratoryService.correctResult(this.data.orderId, this.data.item.id, this.model()),
        );
        this.successNotifier.show(translate('laboratory.done.correct'));
        this.dialogRef.close(order);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('laboratory.saveError'));
        const fieldsByName = {
          value: this.correctionForm.value,
          comment: this.correctionForm.comment,
          reason: this.correctionForm.reason,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }
}
