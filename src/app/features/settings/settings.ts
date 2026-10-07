import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { environment } from '../../../environments/environment';
import { parseApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { Clinic, InpatientBillingMode, LOCALE_LABELS, Locale } from '../../core/models/clinic.model';
import { AccentColor, ThemePreference, ThemeService } from '../../core/services/theme.service';
import { UserGuideService } from '../../core/services/user-guide.service';
import { SuccessNotifier } from '../../shared/notifications/success-notifier';
import { ClinicService } from './clinic.service';
import { CURRENCY_CODES, CurrencyCode, DEFAULT_CURRENCY, currencySymbol } from '../../core/utils/money';

interface LogoField {
  key: 'logo_light' | 'logo_dark' | 'logo_print' | 'favicon';
  labelKey: string; // i18n/*.json → settings.*
}

const LOGO_FIELDS: LogoField[] = [
  { key: 'logo_light', labelKey: 'settings.logoLight' },
  { key: 'logo_dark', labelKey: 'settings.logoDark' },
  { key: 'logo_print', labelKey: 'settings.logoPrint' },
  { key: 'favicon', labelKey: 'settings.favicon' },
];

@Component({
  selector: 'app-settings',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    RouterLink,
    TranslocoPipe,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly auth = inject(AuthService);
  private readonly clinicService = inject(ClinicService);
  private readonly successNotifier = inject(SuccessNotifier);
  protected readonly themeService = inject(ThemeService);

  private readonly userGuideService = inject(UserGuideService);

  protected readonly logoFields = LOGO_FIELDS;
  protected readonly localeOptions = Object.entries(LOCALE_LABELS) as [Locale, string][];
  protected readonly currencyOptions = CURRENCY_CODES;
  protected readonly currencySymbol = currencySymbol;

  private readonly clinicId = computed(() => this.auth.user()?.clinic ?? null);

  protected readonly clinicResource = httpResource<Clinic | null>(
    () => {
      const id = this.clinicId();
      return id ? { url: `${environment.apiBaseUrl}/clinics/${id}/` } : undefined;
    },
    { defaultValue: null },
  );

  protected readonly locale = signal<Locale>('fr');
  protected readonly currency = signal<CurrencyCode>(DEFAULT_CURRENCY);
  protected readonly billingMode = signal<InpatientBillingMode>('flat');
  protected readonly nightlyRate = signal('');
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly pendingFiles = signal<Partial<Record<LogoField['key'], File>>>({});
  private readonly previewUrls = signal<Partial<Record<LogoField['key'], string>>>({});

  constructor() {
    // Synchronise la locale depuis la clinique chargée à chaque (re)chargement — reprend le pattern d'effect utilisé
    // par patient-form.ts/invoice-form.ts pour synchroniser une resource vers un état local éditable.
    effect(() => {
      const clinic = this.clinicResource.value();
      if (clinic) {
        this.locale.set(clinic.locale);
        this.currency.set(clinic.currency);
        this.billingMode.set(clinic.inpatient_billing_mode);
        this.nightlyRate.set(clinic.inpatient_nightly_rate ?? '');
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
    formData.append('currency', this.currency());
    formData.append('inpatient_billing_mode', this.billingMode());
    if (this.nightlyRate().trim()) {
      formData.append('inpatient_nightly_rate', this.nightlyRate().trim());
    }
    for (const [key, file] of Object.entries(this.pendingFiles())) {
      formData.append(key, file);
    }

    try {
      await firstValueFrom(this.clinicService.updateSettings(id, formData));
      this.pendingFiles.set({});
      this.successNotifier.show(translate('settings.saved'));
      this.clinicResource.reload();
      // Devise en session (estimation des nouvelles factures, saisie des prix) — docs/i18n.md §8.
      this.auth.refreshUser();
    } catch (error) {
      const apiError = parseApiError(error, translate('settings.saveError'));
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

  protected downloadUserGuide(): void {
    this.userGuideService.download();
  }
}
