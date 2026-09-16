import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './core/auth/auth.interceptor';

// Toute l'UI est en français uniquement aujourd'hui (pas encore de bascule i18n câblée — voir le
// champ `locale` de settings.ts, qui est stocké mais pas appliqué). Les pipes `date`/`number`/`currency`
// d'Angular utilisent en-US par défaut sans cela, ce qui explique pourquoi les dates de facture/rendez-vous
// s'affichaient en "Aug 20, 2026" au lieu de "20 août 2026".
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideClientHydration(withEventReplay()),
    provideNativeDateAdapter(),
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'fr' },
    { provide: MAT_DATE_LOCALE, useValue: 'fr' },
  ],
};
