import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { LanguageService } from '../../../core/i18n/language.service';
import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';
import { APP_NAME } from '../../../core/brand';

interface LoginFormModel {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
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
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  protected readonly appName = APP_NAME;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly language = inject(LanguageService);

  protected readonly hidePassword = signal(true);

  protected readonly model = signal<LoginFormModel>({ email: '', password: '' });

  protected readonly loginForm = form(this.model, (path) => {
    required(path.email, { message: translate('common.validation.emailRequired') });
    email(path.email, { message: translate('common.validation.emailInvalid') });
    required(path.password, { message: translate('common.validation.passwordRequired') });
  });

  protected togglePasswordVisibility(): void {
    this.hidePassword.update((hidden) => !hidden);
  }

  protected async onSubmit(): Promise<void> {
    await submit(this.loginForm, async () => {
      try {
        const response = await firstValueFrom(this.auth.login(this.model()));
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        if (!this.language.openInPreferredLanguage(response.user.language, returnUrl)) {
          this.router.navigateByUrl(returnUrl);
        }
        return undefined;
      } catch (error) {
        const { message } = parseApiError(error, translate('auth.login.error'));
        return [{ kind: 'server', message }];
      }
    });
  }
}
