import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, minLength, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe, translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { Patient } from '../patient.model';

interface EmergencyAccessModel {
  patient_number: string;
  reason: string;
}

// Mêmes règles que le backend (patients/access.py::grant_emergency_access).
const REASON_MIN_LENGTH = 10;

// Accès d'urgence (« bris de glace ») : un médecin ouvre pour 24 h le dossier d'un patient qui n'est
// pas le sien, en donnant son numéro exact et un motif. Journalisé et signalé à l'administrateur.
// Renvoie le patient à l'ouverture de la fenêtre appelante.
@Component({
  selector: 'app-emergency-access-dialog',
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
  templateUrl: './emergency-access-dialog.html',
  styleUrl: './emergency-access-dialog.css',
})
export class EmergencyAccessDialog {
  private readonly http = inject(HttpClient);
  protected readonly dialogRef = inject(MatDialogRef<EmergencyAccessDialog, Patient>);

  protected readonly model = signal<EmergencyAccessModel>({ patient_number: '', reason: '' });

  protected readonly accessForm = form(this.model, (path) => {
    required(path.patient_number, { message: translate('patients.emergency.numberRequired') });
    required(path.reason, { message: translate('patients.emergency.reasonRequired', { count: REASON_MIN_LENGTH }) });
    minLength(path.reason, REASON_MIN_LENGTH, {
      message: translate('patients.emergency.reasonRequired', { count: REASON_MIN_LENGTH }),
    });
  });

  protected async onSubmit(): Promise<void> {
    await submit(this.accessForm, async () => {
      try {
        const patient = await firstValueFrom(
          this.http.post<Patient>(`${environment.apiBaseUrl}/patients/emergency-access/`, this.model()),
        );
        this.dialogRef.close(patient);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('patients.emergency.error'));
        const fieldsByName = {
          patient_number: this.accessForm.patient_number,
          reason: this.accessForm.reason,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }
}
