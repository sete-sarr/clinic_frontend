import { Component, computed, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, maxLength, min, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe, translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { parseApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { Medication, SplitPacksPayload } from '../../../core/models/pharmacy.model';
import { DEFAULT_CURRENCY, currencySymbol } from '../../../core/utils/money';
import { MedicationService } from '../medication.service';

// « Détailler le stock » : un médicament jusqu'ici compté par conditionnement (ex. en boîtes) passe
// à une unité de base plus fine (ex. 50 comprimés par boîte). Le serveur multiplie lots, historique,
// seuils et factures passées par ce nombre (pharmacy/services.py::split_medication_packs).
@Component({
  selector: 'app-split-packs-dialog',
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
  ],
  templateUrl: './split-packs-dialog.html',
  styleUrl: '../medication-form/medication-form.css',
})
export class SplitPacksDialog {
  protected readonly currencySymbol = currencySymbol(inject(AuthService).user()?.clinic_currency ?? DEFAULT_CURRENCY);
  private readonly medicationService = inject(MedicationService);
  protected readonly dialogRef = inject(MatDialogRef<SplitPacksDialog>);
  protected readonly medication = inject<Medication>(MAT_DIALOG_DATA);

  protected readonly model = signal<SplitPacksPayload>({
    units_per_pack: 2,
    unit: '',
    unit_price: 0,
    allow_unit_sale: true,
  });

  protected readonly splitForm = form(this.model, (path) => {
    required(path.units_per_pack, { message: translate('pharmacy.split.unitsPerPackMin') });
    min(path.units_per_pack, 2, { message: translate('pharmacy.split.unitsPerPackMin') });
    required(path.unit, { message: translate('pharmacy.unitRequired') });
    maxLength(path.unit, 50, { message: translate('pharmacy.unitTooLong') });
    min(path.unit_price, 0, { message: translate('pharmacy.priceNotNegative') });
  });

  // Aperçu de la conversion, recalculé à la saisie.
  protected readonly preview = computed(() => {
    const factor = Math.max(Number(this.model().units_per_pack) || 0, 0);
    return {
      packs: this.medication.current_stock,
      packUnit: this.medication.unit,
      units: this.medication.current_stock * factor,
      unit: this.model().unit || '…',
    };
  });

  protected async onSubmit(): Promise<void> {
    await submit(this.splitForm, async () => {
      try {
        const updated = await firstValueFrom(this.medicationService.splitPacks(this.medication.id, this.model()));
        this.dialogRef.close(updated);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('pharmacy.split.error'));
        const fieldsByName = {
          units_per_pack: this.splitForm.units_per_pack,
          unit: this.splitForm.unit,
          unit_price: this.splitForm.unit_price,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }
}
