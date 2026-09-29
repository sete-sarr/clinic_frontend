import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { EnvironmentProviders, LOCALE_ID, Provider, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { LanguageService } from './language.service';
import { SUPPORTED_LANGUAGES } from './languages';
import { AppTranslocoLoader } from './transloco-loader';

// Données de locale pour les pipes date/number/currency : fr à enregistrer, en (en-US) est intégré.
registerLocaleData(localeFr);

// Tout le câblage de la langue de l'interface (docs/i18n.md §3), en un seul point.
export function provideI18n(): (Provider | EnvironmentProviders)[] {
  return [
    provideTransloco({
      config: {
        availableLangs: [...SUPPORTED_LANGUAGES],
        defaultLang: 'fr',
        // Une clé absente d'une langue retombe sur le français plutôt que d'afficher la clé brute ;
        // i18n-parity.spec.ts empêche ce cas d'arriver en production.
        fallbackLang: 'fr',
        missingHandler: { useFallbackTranslation: true, logMissingKey: isDevMode() },
        // Le changement de langue recharge la page (LanguageService) : pas de re-rendu à chaud.
        reRenderOnLangChange: false,
        prodMode: !isDevMode(),
      },
      loader: AppTranslocoLoader,
    }),
    { provide: LOCALE_ID, useFactory: () => inject(LanguageService).current() },
    { provide: MAT_DATE_LOCALE, useFactory: () => inject(LanguageService).current() },
    // Charge les traductions de la langue active avant le premier affichage (pas de clés brutes
    // visibles le temps du chargement).
    provideAppInitializer(() => {
      const language = inject(LanguageService).current();
      const transloco = inject(TranslocoService);
      transloco.setActiveLang(language);
      return firstValueFrom(transloco.load(language));
    }),
  ];
}
