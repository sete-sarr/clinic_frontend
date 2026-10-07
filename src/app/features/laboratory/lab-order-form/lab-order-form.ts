import { Component, LOCALE_ID, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, submit, validate } from '@angular/forms/signals';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { PatientSummary } from '../../../core/models/patient.model';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { Consultation } from '../../consultations/consultation.model';
import { LabOrderPayload, LabTest } from '../laboratory.model';
import { LaboratoryService } from '../laboratory.service';
import { apiResource } from '../../../core/api/api-resource';

function formatPatient(patient: PatientSummary): string {
  return `${patient.first_name} ${patient.last_name} (${patient.patient_number})`;
}

// Nouvelle demande d'examens — réservée au médecin, toujours en son nom (le backend impose le
// médecin connecté comme prescripteur, laboratory/api/views.py).
@Component({
  selector: 'app-lab-order-form',
  imports: [
    FormField,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  templateUrl: './lab-order-form.html',
  styleUrl: '../laboratory-form.css',
})
export class LabOrderForm {
  private readonly locale = inject(LOCALE_ID);
  private readonly laboratoryService = inject(LaboratoryService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<LabOrderForm>);

  protected readonly model = signal<LabOrderPayload>({ patient: 0, consultation: null, tests: [], clinical_note: '' });

  protected readonly patientQuery = signal('');
  protected readonly patientLabel = signal('');

  protected readonly patientsResource = apiResource<Paginated<PatientSummary>>(
    () => ({ url: `${environment.apiBaseUrl}/patients/`, params: { search: this.patientQuery(), page_size: 10 } }),
    { defaultValue: emptyPage<PatientSummary>() },
  );

  protected readonly consultationsResource = apiResource<Paginated<Consultation>>(
    () =>
      this.model().patient
        ? { url: `${environment.apiBaseUrl}/consultations/`, params: { patient: this.model().patient, page_size: 50 } }
        : undefined,
    { defaultValue: emptyPage<Consultation>() },
  );

  protected readonly testsResource = apiResource<Paginated<LabTest>>(
    () => ({ url: this.laboratoryService.testsUrl, params: { is_active: 'true', page_size: 200 } }),
    { defaultValue: emptyPage<LabTest>() },
  );

  protected readonly orderForm = form(this.model, (path) => {
    validate(path.patient, ({ value }) =>
      value() ? undefined : { kind: 'required', message: translate('common.validation.patientRequired') },
    );
    validate(path.tests, ({ value }) =>
      value().length > 0 ? undefined : { kind: 'required', message: translate('laboratory.testsRequired') },
    );
  });

  protected formatPatientOption(patient: PatientSummary): string {
    return formatPatient(patient);
  }

  protected formatConsultationOption(consultation: Consultation): string {
    const complaint = consultation.chief_complaint.slice(0, 40) || translate('prescriptions.noComplaint');
    return `${new Date(consultation.date).toLocaleString(this.locale)} — ${complaint}`;
  }

  protected onPatientQueryInput(value: string): void {
    this.patientQuery.set(value);
    this.patientLabel.set(value);
    this.model.update((current) => ({ ...current, patient: 0, consultation: null }));
  }

  protected onPatientSelected(patient: PatientSummary): void {
    this.patientLabel.set(formatPatient(patient));
    this.model.update((current) => ({ ...current, patient: patient.id, consultation: null }));
  }

  protected async onSubmit(): Promise<void> {
    await submit(this.orderForm, async () => {
      try {
        const created = await firstValueFrom(this.laboratoryService.createOrder(this.model()));
        this.successNotifier.show(translate('laboratory.orderCreated'));
        this.dialogRef.close(created);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('laboratory.saveError'));
        const fieldsByName = {
          patient: this.orderForm.patient,
          consultation: this.orderForm.consultation,
          tests: this.orderForm.tests,
          clinical_note: this.orderForm.clinical_note,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }
}
