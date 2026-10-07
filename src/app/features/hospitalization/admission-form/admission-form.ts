import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, required, submit, validate } from '@angular/forms/signals';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
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
import { DepartmentSummary } from '../../../core/models/department.model';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { PatientSummary } from '../../../core/models/patient.model';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { AdmissionPayload, Bed, bedLocation } from '../hospitalization.model';
import { HospitalizationService } from '../hospitalization.service';

function formatPatient(patient: PatientSummary): string {
  return `${patient.first_name} ${patient.last_name} (${patient.patient_number})`;
}

// Nouvelle hospitalisation — réservée au médecin (décision du 2026-10-07), qui devient le médecin
// référent. Admission immédiate dans un lit libre, ou séjour planifié à admettre plus tard.
@Component({
  selector: 'app-admission-form',
  imports: [
    FormField,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  templateUrl: './admission-form.html',
  styleUrl: '../hospitalization-form.css',
})
export class AdmissionForm {
  private readonly hospitalizationService = inject(HospitalizationService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<AdmissionForm>);
  protected readonly bedLocation = bedLocation;

  protected readonly admitNow = signal(true);
  protected readonly model = signal<AdmissionPayload>({ patient: 0, department: 0, reason: '', planned_for: null, bed: null });
  protected readonly patientQuery = signal('');
  protected readonly patientLabel = signal('');

  protected readonly patientsResource = httpResource<Paginated<PatientSummary>>(
    () => ({ url: `${environment.apiBaseUrl}/patients/`, params: { search: this.patientQuery(), page_size: 10 } }),
    { defaultValue: emptyPage<PatientSummary>() },
  );
  protected readonly departmentsResource = httpResource<Paginated<DepartmentSummary>>(
    () => ({ url: `${environment.apiBaseUrl}/departments/`, params: { is_active: 'true', page_size: 100 } }),
    { defaultValue: emptyPage<DepartmentSummary>() },
  );
  private readonly bedsResource = httpResource<Bed[]>(() => this.hospitalizationService.boardUrl, { defaultValue: [] });
  protected readonly freeBeds = computed(() =>
    this.bedsResource.value().filter((bed) => bed.status === 'free' && bed.department === this.model().department),
  );

  protected readonly admissionForm = form(this.model, (path) => {
    validate(path.patient, ({ value }) =>
      value() ? undefined : { kind: 'required', message: translate('common.validation.patientRequired') },
    );
    validate(path.department, ({ value }) =>
      value() ? undefined : { kind: 'required', message: translate('hospitalization.departmentRequired') },
    );
    required(path.reason, { message: translate('hospitalization.reasonRequired') });
    validate(path.bed, ({ value }) =>
      !this.admitNow() || value() ? undefined : { kind: 'required', message: translate('hospitalization.bedRequired') },
    );
  });

  protected formatPatientOption(patient: PatientSummary): string {
    return formatPatient(patient);
  }

  protected onPatientQueryInput(value: string): void {
    this.patientQuery.set(value);
    this.patientLabel.set(value);
    this.model.update((current) => ({ ...current, patient: 0 }));
  }

  protected onPatientSelected(patient: PatientSummary): void {
    this.patientLabel.set(formatPatient(patient));
    this.model.update((current) => ({ ...current, patient: patient.id }));
  }

  protected onDepartmentChange(): void {
    this.model.update((current) => ({ ...current, bed: null }));
  }

  protected async onSubmit(): Promise<void> {
    await submit(this.admissionForm, async () => {
      const value = this.model();
      const payload: AdmissionPayload = this.admitNow()
        ? { ...value, planned_for: null }
        : { ...value, bed: null, planned_for: value.planned_for || null };
      try {
        const created = await firstValueFrom(this.hospitalizationService.createAdmission(payload));
        this.successNotifier.show(translate(this.admitNow() ? 'hospitalization.done.admit' : 'hospitalization.done.planned'));
        this.dialogRef.close(created);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('hospitalization.saveError'));
        const fieldsByName = {
          patient: this.admissionForm.patient,
          department: this.admissionForm.department,
          reason: this.admissionForm.reason,
          bed: this.admissionForm.bed,
        } as Record<string, FieldTree<unknown>>;
        return [{ kind: 'server', message: apiError.message, fieldTree: apiError.field ? fieldsByName[apiError.field] : undefined }];
      }
    });
  }
}
