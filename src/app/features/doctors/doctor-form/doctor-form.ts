import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FieldTree, FormField, email, form, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { DepartmentSummary } from '../../../core/models/department.model';
import { Doctor } from '../../../core/models/doctor.model';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { DoctorService } from '../doctor.service';

export interface DoctorFormDialogData {
  id?: string;
}

interface DoctorFormModel {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  department: number | null;
  professional_number: string;
  specialty: string;
  phone: string;
}

@Component({
  selector: 'app-doctor-form',
  imports: [
    FormField,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './doctor-form.html',
  styleUrl: './doctor-form.css',
})
export class DoctorForm {
  private readonly doctorService = inject(DoctorService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly dialogRef = inject(MatDialogRef<DoctorForm>);
  private readonly data = inject<DoctorFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  protected readonly currentId = signal<string | undefined>(this.data?.id);

  protected readonly isEditMode = computed(() => this.currentId() !== undefined);

  protected readonly doctorResource = httpResource<Doctor | null>(
    () => (this.currentId() ? { url: `${environment.apiBaseUrl}/doctors/${this.currentId()}/` } : undefined),
    { defaultValue: null },
  );

  protected readonly departmentsResource = httpResource<Paginated<DepartmentSummary>>(
    () => ({ url: `${environment.apiBaseUrl}/departments/`, params: { is_active: true } }),
    { defaultValue: emptyPage<DepartmentSummary>() },
  );
  protected readonly departmentOptions = computed(() => this.departmentsResource.value().results);

  protected readonly model = signal<DoctorFormModel>({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    department: null,
    professional_number: '',
    specialty: '',
    phone: '',
  });

  protected readonly doctorForm = form(this.model, (path) => {
    required(path.first_name, { message: 'Prénom requis' });
    required(path.last_name, { message: 'Nom requis' });
    required(path.professional_number, { message: 'N° professionnel requis' });
    required(path.specialty, { message: 'Spécialité requise' });
    email(path.email, { message: 'Adresse e-mail invalide' });
    if (!this.isEditMode()) {
      required(path.username, { message: "Nom d'utilisateur requis" });
      required(path.email, { message: 'Adresse e-mail requise' });
      required(path.password, { message: 'Mot de passe requis' });
    }
  });

  constructor() {
    effect(() => {
      const doctor = this.doctorResource.value();
      if (doctor) {
        this.model.set({
          username: doctor.user.username,
          first_name: doctor.user.first_name,
          last_name: doctor.user.last_name,
          email: doctor.user.email,
          password: '',
          department: doctor.department,
          professional_number: doctor.professional_number,
          specialty: doctor.specialty,
          phone: doctor.phone,
        });
      }
    });
  }

  protected async onSubmit(): Promise<void> {
    await submit(this.doctorForm, async () => {
      const value = this.model();
      try {
        const id = this.currentId();
        if (id) {
          await firstValueFrom(
            this.doctorService.update(Number(id), {
              department: value.department,
              professional_number: value.professional_number,
              specialty: value.specialty,
              phone: value.phone,
            }),
          );
        } else {
          await firstValueFrom(
            this.doctorService.create({
              username: value.username,
              email: value.email,
              first_name: value.first_name,
              last_name: value.last_name,
              password: value.password,
              department: value.department,
              professional_number: value.professional_number,
              specialty: value.specialty,
              phone: value.phone,
            }),
          );
        }
        this.successNotifier.show('Médecin enregistré avec succès.');
        this.dialogRef.close(true);
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, "Impossible d'enregistrer ce médecin.");
        const fieldsByName = {
          username: this.doctorForm.username,
          first_name: this.doctorForm.first_name,
          last_name: this.doctorForm.last_name,
          email: this.doctorForm.email,
          password: this.doctorForm.password,
          department: this.doctorForm.department,
          professional_number: this.doctorForm.professional_number,
          specialty: this.doctorForm.specialty,
          phone: this.doctorForm.phone,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }
}
