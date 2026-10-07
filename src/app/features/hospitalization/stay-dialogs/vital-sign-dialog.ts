import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { parseApiError } from '../../../core/api/api-error';
import { VitalSign, VitalSignPayload } from '../hospitalization.model';
import { HospitalizationService } from '../hospitalization.service';

// Champs de saisie et bornes indicatives (le backend refuse toute valeur hors bornes
// physiologiques : hospitalization/services.py::VITAL_RANGES).
export const VITAL_FIELDS: { key: keyof VitalSignPayload; unit: string; min: number; max: number; step: string }[] = [
  { key: 'temperature', unit: '°C', min: 30, max: 45, step: '0.1' },
  { key: 'systolic', unit: 'mmHg', min: 40, max: 300, step: '1' },
  { key: 'diastolic', unit: 'mmHg', min: 20, max: 200, step: '1' },
  { key: 'pulse', unit: '/min', min: 20, max: 250, step: '1' },
  { key: 'respiratory_rate', unit: '/min', min: 4, max: 80, step: '1' },
  { key: 'oxygen_saturation', unit: '%', min: 0, max: 100, step: '1' },
  { key: 'weight', unit: 'kg', min: 0.3, max: 500, step: '0.1' },
  { key: 'pain', unit: '/10', min: 0, max: 10, step: '1' },
];

@Component({
  selector: 'app-vital-sign-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
  ],
  templateUrl: './vital-sign-dialog.html',
  styleUrl: '../hospitalization-form.css',
})
export class VitalSignDialog {
  private readonly hospitalizationService = inject(HospitalizationService);
  protected readonly dialogRef = inject(MatDialogRef<VitalSignDialog, VitalSign>);
  private readonly admissionId = inject<number>(MAT_DIALOG_DATA);

  protected readonly fields = VITAL_FIELDS;
  protected readonly values = signal<Partial<Record<string, string>>>({});
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected setValue(key: string, value: string): void {
    this.values.update((current) => ({ ...current, [key]: value }));
  }

  protected confirm(): void {
    const payload = Object.fromEntries(
      Object.entries(this.values())
        .filter((entry): entry is [string, string] => (entry[1] ?? '').trim() !== '')
        .map(([key, value]) => [key, Number(value)]),
    ) as VitalSignPayload;
    if (Object.keys(payload).length === 0) {
      this.error.set(translate('hospitalization.vitalsRequired'));
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    this.hospitalizationService.recordVitals(this.admissionId, payload).subscribe({
      next: (vital) => this.dialogRef.close(vital),
      error: (error) => {
        this.pending.set(false);
        this.error.set(parseApiError(error, translate('hospitalization.saveError')).message);
      },
    });
  }
}
