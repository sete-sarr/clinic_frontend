import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { parseApiError } from '../../../core/api/api-error';
import { Admission } from '../hospitalization.model';
import { HospitalizationService } from '../hospitalization.service';

// Sortie prononcée par un médecin : synthèse de sortie, libération du lit et facturation des
// nuitées dans la même transaction (business/workflow-policy.md § SÉJOUR).
@Component({
  selector: 'app-discharge-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
  ],
  templateUrl: './discharge-dialog.html',
  styleUrl: '../hospitalization-form.css',
})
export class DischargeDialog {
  private readonly hospitalizationService = inject(HospitalizationService);
  protected readonly dialogRef = inject(MatDialogRef<DischargeDialog, Admission>);
  protected readonly admission = inject<Admission>(MAT_DIALOG_DATA);

  protected readonly summary = signal('');
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected confirm(): void {
    this.pending.set(true);
    this.error.set(null);
    this.hospitalizationService.discharge(this.admission.id, this.summary().trim()).subscribe({
      next: (admission) => this.dialogRef.close(admission),
      error: (error) => {
        this.pending.set(false);
        this.error.set(parseApiError(error, translate('hospitalization.saveError')).message);
      },
    });
  }
}
