import { httpResource } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { toIsoDate } from '../../../core/utils/date';
import { ActivationService, ClinicSummary } from './activation.service';

interface IdentityFormModel {
  clinic: number | null;
  patient_number: string;
  phone: string;
  date_of_birth: Date | null;
}

interface CredentialsFormModel {
  code: string;
  username: string;
  password: string;
}

@Component({
  selector: 'app-activation',
  imports: [
    FormField,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './activation.html',
  styleUrl: './activation.css',
})
export class Activation {
  private readonly activationService = inject(ActivationService);
  private readonly router = inject(Router);

  protected readonly step = signal<'identify' | 'verify' | 'done'>('identify');
  protected readonly today = new Date();

  protected readonly clinicQuery = signal('');
  protected readonly clinicLabel = signal('');

  protected readonly clinicsResource = httpResource<Paginated<ClinicSummary>>(
    () => ({
      url: `${environment.apiBaseUrl}/clinics/public/`,
      params: { search: this.clinicQuery(), page_size: 10 },
    }),
    { defaultValue: emptyPage<ClinicSummary>() },
  );

  protected readonly identityModel = signal<IdentityFormModel>({
    clinic: null,
    patient_number: '',
    phone: '',
    date_of_birth: null,
  });

  protected readonly identityForm = form(this.identityModel, (path) => {
    required(path.clinic, { message: 'Clinique requise' });
    required(path.patient_number, { message: 'Numéro patient requis' });
    required(path.phone, { message: 'Téléphone requis' });
    required(path.date_of_birth, { message: 'Date de naissance requise' });
  });

  protected readonly credentialsModel = signal<CredentialsFormModel>({
    code: '',
    username: '',
    password: '',
  });

  protected readonly credentialsForm = form(this.credentialsModel, (path) => {
    required(path.code, { message: 'Code requis' });
    maxLength(path.code, 6, { message: '6 chiffres maximum' });
    required(path.username, { message: "Nom d'utilisateur requis" });
    required(path.password, { message: 'Mot de passe requis' });
  });

  protected onClinicQueryInput(value: string): void {
    this.clinicQuery.set(value);
    this.clinicLabel.set(value);
    this.identityForm.clinic().value.set(null);
  }

  protected onClinicSelected(clinic: ClinicSummary): void {
    this.identityForm.clinic().value.set(clinic.id);
    this.clinicLabel.set(clinic.name);
  }

  protected async onIdentitySubmit(): Promise<void> {
    await submit(this.identityForm, async () => {
      const value = this.identityModel();
      try {
        await firstValueFrom(
          this.activationService.requestActivation({
            clinic: value.clinic!,
            patient_number: value.patient_number,
            phone: value.phone,
            date_of_birth: toIsoDate(value.date_of_birth!),
          }),
        );
        this.step.set('verify');
        return undefined;
      } catch (error) {
        const { message } = parseApiError(error, 'Impossible d’envoyer le code. Réessayez.');
        return [{ kind: 'server', message }];
      }
    });
  }

  protected async onCredentialsSubmit(): Promise<void> {
    await submit(this.credentialsForm, async () => {
      const identity = this.identityModel();
      const credentials = this.credentialsModel();
      try {
        await firstValueFrom(
          this.activationService.verifyActivation({
            clinic: identity.clinic!,
            patient_number: identity.patient_number,
            phone: identity.phone,
            date_of_birth: toIsoDate(identity.date_of_birth!),
            code: credentials.code,
            username: credentials.username,
            password: credentials.password,
          }),
        );
        this.step.set('done');
        return undefined;
      } catch (error) {
        const { message } = parseApiError(error, 'Code invalide ou expiré.');
        return [{ kind: 'server', message }];
      }
    });
  }

  protected goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
