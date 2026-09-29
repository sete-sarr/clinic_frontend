import { Component, inject, signal } from '@angular/core';
import { FieldTree, FormField, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { parseApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';
import { APP_NAME } from '../../../core/brand';

interface RegisterClinicFormModel {
  clinic_name: string;
  clinic_email: string;
  clinic_phone: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
}

@Component({
  selector: 'app-register-clinic',
  imports: [
    LanguageSwitcher,
    FormField,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
  ],
  templateUrl: './register-clinic.html',
  styleUrl: './register-clinic.css',
})
export class RegisterClinic {
  protected readonly appName = APP_NAME;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly hidePassword = signal(true);

  protected readonly model = signal<RegisterClinicFormModel>({
    clinic_name: '',
    clinic_email: '',
    clinic_phone: '',
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
  });

  protected readonly registerForm = form(this.model, (path) => {
    required(path.clinic_name, { message: translate('auth.register.clinicNameRequired') });
    required(path.username, { message: translate('common.validation.usernameRequired') });
    required(path.email, { message: translate('common.validation.emailRequired') });
    required(path.first_name, { message: translate('common.validation.firstNameRequired') });
    required(path.last_name, { message: translate('common.validation.lastNameRequired') });
    required(path.password, { message: translate('common.validation.passwordRequired') });
  });

  protected togglePasswordVisibility(): void {
    this.hidePassword.update((hidden) => !hidden);
  }

  protected async onSubmit(): Promise<void> {
    await submit(this.registerForm, async () => {
      try {
        await firstValueFrom(this.auth.registerClinic(this.model()));
        this.router.navigateByUrl('/');
        return undefined;
      } catch (error) {
        const apiError = parseApiError(error, translate('auth.register.error'));
        const fieldsByName = {
          clinic_name: this.registerForm.clinic_name,
          clinic_email: this.registerForm.clinic_email,
          clinic_phone: this.registerForm.clinic_phone,
          username: this.registerForm.username,
          email: this.registerForm.email,
          first_name: this.registerForm.first_name,
          last_name: this.registerForm.last_name,
          password: this.registerForm.password,
        } as Record<string, FieldTree<unknown>>;
        const fieldTree = apiError.field ? fieldsByName[apiError.field] : undefined;
        return [{ kind: 'server', message: apiError.message, fieldTree }];
      }
    });
  }
}
