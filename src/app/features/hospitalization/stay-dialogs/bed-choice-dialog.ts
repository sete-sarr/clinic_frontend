import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { parseApiError } from '../../../core/api/api-error';
import { Admission, Bed, bedLocation } from '../hospitalization.model';
import { HospitalizationService } from '../hospitalization.service';

export interface BedChoiceData {
  admission: Admission;
  mode: 'admit' | 'transfer';
}

// Choix d'un lit libre : admission d'un séjour planifié ou transfert (avec motif). Seuls les lits
// libres sont proposés ; le backend revérifie sous verrou qu'il l'est toujours.
@Component({
  selector: 'app-bed-choice-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  templateUrl: './bed-choice-dialog.html',
  styleUrl: '../hospitalization-form.css',
})
export class BedChoiceDialog {
  private readonly hospitalizationService = inject(HospitalizationService);
  protected readonly dialogRef = inject(MatDialogRef<BedChoiceDialog, Admission>);
  protected readonly data = inject<BedChoiceData>(MAT_DIALOG_DATA);
  protected readonly bedLocation = bedLocation;

  private readonly bedsResource = httpResource<Bed[]>(() => this.hospitalizationService.boardUrl, { defaultValue: [] });
  // Lits libres, ceux du service du séjour en premier.
  protected readonly freeBeds = computed(() =>
    this.bedsResource
      .value()
      .filter((bed) => bed.status === 'free')
      .sort((a, b) => Number(b.department === this.data.admission.department) - Number(a.department === this.data.admission.department)),
  );

  protected readonly bed = signal<number | null>(null);
  protected readonly reason = signal('');
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected confirm(): void {
    const bed = this.bed();
    if (!bed) {
      this.error.set(translate('hospitalization.bedRequired'));
      return;
    }
    const id = this.data.admission.id;
    const request$: Observable<Admission> =
      this.data.mode === 'admit'
        ? this.hospitalizationService.admit(id, bed)
        : this.hospitalizationService.transfer(id, bed, this.reason().trim());
    this.pending.set(true);
    this.error.set(null);
    request$.subscribe({
      next: (admission) => this.dialogRef.close(admission),
      error: (error) => {
        this.pending.set(false);
        this.error.set(parseApiError(error, translate('hospitalization.saveError')).message);
      },
    });
  }
}
