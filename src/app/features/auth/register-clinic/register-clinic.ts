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

import { parseApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';

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
    FormField,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './register-clinic.html',
  styleUrl: './register-clinic.css',
})
export class RegisterClinic {
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
    required(path.clinic_name, { message: 'Nom de la clinique requis' });
    required(path.username, { message: "Nom d'utilisateur requis" });
    required(path.email, { message: 'E-mail requis' });
    required(path.first_name, { message: 'Prénom requis' });
    required(path.last_name, { message: 'Nom requis' });
    required(path.password, { message: 'Mot de passe requis' });
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
        const apiError = parseApiError(error, "Impossible de créer la clinique. Réessayez dans un instant.");
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
