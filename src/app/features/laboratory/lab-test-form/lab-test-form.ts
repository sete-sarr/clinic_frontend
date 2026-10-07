import { Component, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, maxLength, min, required, submit, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { parseApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { DEFAULT_CURRENCY, currencySymbol } from '../../../core/utils/money';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { LabTest, LabTestPayload } from '../laboratory.model';
import { LaboratoryService } from '../laboratory.service';

const toNumber = (value: string | null) => (value === null ? null : Number(value));
const isEmpty = (value: unknown) => value === null || value === '';

@Component({
  selector: 'app-lab-test-form',
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
  templateUrl: './lab-test-form.html',
  styleUrl: '../laboratory-form.css',
})
export class LabTestForm {
  // Prix saisi dans la devise actuelle de la clinique (docs/i18n.md §8).
  protected readonly currencySymbol = currencySymbol(inject(AuthService).user()?.clinic_currency ?? DEFAULT_CURRENCY);
  private readonly laboratoryService = inject(LaboratoryService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<LabTestForm>);
  protected readonly test = inject<LabTest | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly model = signal<LabTestPayload>({
    code: this.test?.code ?? '',
    name: this.test?.name ?? '',
    price: Number(this.test?.price ?? 0),
    unit: this.test?.unit ?? '',
    reference_min: toNumber(this.test?.reference_min ?? null),
    reference_max: toNumber(this.test?.reference_max ?? null),
  });

  protected readonly testForm = form(this.model, (path) => {
    required(path.code, { message: translate('laboratory.codeRequired') });
    maxLength(path.code, 30, { message: translate('laboratory.codeTooLong') });
    required(path.name, { message: translate('laboratory.nameRequired') });
    maxLength(path.name, 200, { message: translate('laboratory.nameTooLong') });
    maxLength(path.unit, 30, { message: translate('laboratory.unitTooLong') });
    min(path.price, 0, { message: translate('laboratory.priceNotNegative') });
    // Reflète la contrainte lab_test_reference_max_gte_min (laboratory/models.py), revérifiée côté serveur.
    validate(path.reference_max, ({ value, valueOf }) => {
      const max = value();
      const lower = valueOf(path.reference_min);
      if (isEmpty(max) || isEmpty(lower)) {
        return undefined;
      }
      return Number(max) < Number(lower)
        ? { kind: 'maxBelowMin', message: translate('laboratory.maxBelowMin') }
        : undefined;
    });
  });

  protected async onSubmit(): Promise<void> {
    await submit(this.testForm, async () => {
      const value = this.model();
      const payload: LabTestPayload = {
        ...value,
        reference_min: isEmpty(value.reference_min) ? null : value.reference_min,
        reference_max: isEmpty(value.reference_max) ? null : value.reference_max,
      };
      try {
        await firstValueFrom(
          this.test ? this.laboratoryService.updateTest(this.test.id, payload) : this.laboratoryService.createTest(payload),
        );
        this.successNotifier.show(translate('laboratory.testSaved'));
        this.dialogRef.close(true);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('laboratory.saveError'));
        const fieldsByName = {
          code: this.testForm.code,
          name: this.testForm.name,
          price: this.testForm.price,
          unit: this.testForm.unit,
          reference_min: this.testForm.reference_min,
          reference_max: this.testForm.reference_max,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }
}
