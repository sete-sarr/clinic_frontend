import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { parseApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { Clinic, LOCALE_LABELS, Locale } from '../../core/models/clinic.model';
import { AccentColor, ThemePreference, ThemeService } from '../../core/services/theme.service';
import { SuccessNotifier } from '../../shared/notifications/success-notifier';
import { ClinicService } from './clinic.service';

interface LogoField {
  key: 'logo_light' | 'logo_dark' | 'logo_print' | 'favicon';
  label: string;
}

const LOGO_FIELDS: LogoField[] = [
  { key: 'logo_light', label: 'Logo clair' },
  { key: 'logo_dark', label: 'Logo sombre' },
  { key: 'logo_print', label: "Logo d'impression" },
  { key: 'favicon', label: 'Favicon' },
];

@Component({
  selector: 'app-settings',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly auth = inject(AuthService);
  private readonly clinicService = inject(ClinicService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly themeService = inject(ThemeService);

  protected readonly logoFields = LOGO_FIELDS;
  protected readonly localeOptions = Object.entries(LOCALE_LABELS) as [Locale, string][];

  private readonly clinicId = computed(() => this.auth.user()?.clinic ?? null);

  protected readonly clinicResource = httpResource<Clinic | null>(
    () => {
      const id = this.clinicId();
      return id ? { url: `${environment.apiBaseUrl}/clinics/${id}/` } : undefined;
    },
    { defaultValue: null },
  );

  protected readonly locale = signal<Locale>('fr');
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly pendingFiles = signal<Partial<Record<LogoField['key'], File>>>({});
  private readonly previewUrls = signal<Partial<Record<LogoField['key'], string>>>({});

  constructor() {
    // Sync locale from the loaded clinic whenever it (re)loads — mirrors the effect pattern used
    // by patient-form.ts/invoice-form.ts for syncing a resource into local editable state.
    effect(() => {
      const clinic = this.clinicResource.value();
      if (clinic) {
        this.locale.set(clinic.locale);
      }
    });
  }

  protected previewFor(key: LogoField['key']): string | null {
    return this.previewUrls()[key] ?? this.clinicResource.value()?.[key] ?? null;
  }

  protected onFileSelected(key: LogoField['key'], event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.pendingFiles.update((current) => ({ ...current, [key]: file }));
    this.previewUrls.update((current) => ({ ...current, [key]: URL.createObjectURL(file) }));
  }

  protected async save(): Promise<void> {
    const id = this.clinicId();
    if (!id) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);

    const formData = new FormData();
    formData.append('locale', this.locale());
    for (const [key, file] of Object.entries(this.pendingFiles())) {
      formData.append(key, file);
    }

    try {
      await firstValueFrom(this.clinicService.updateSettings(id, formData));
      this.pendingFiles.set({});
      this.successNotifier.show('Paramètres enregistrés avec succès.');
      this.clinicResource.reload();
    } catch (error) {
      const apiError = parseApiError(error, "Impossible d'enregistrer les paramètres.");
      this.errorMessage.set(apiError.message);
    } finally {
      this.saving.set(false);
    }
  }

  protected setTheme(theme: ThemePreference): void {
    this.themeService.setTheme(theme);
  }

  protected setAccent(accent: AccentColor): void {
    this.themeService.setAccent(accent);
  }
}
