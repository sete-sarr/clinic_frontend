import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './core/auth/auth.interceptor';
import { languageInterceptor } from './core/i18n/language.interceptor';
import { provideI18n } from './core/i18n/provide-i18n';
import { provideNativeApp } from './core/mobile/native-app';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([languageInterceptor, authInterceptor])),
    provideClientHydration(withEventReplay()),
    provideNativeDateAdapter(),
    provideAnimationsAsync(),
    // Langue de l'interface (FR/EN) : Transloco, LOCALE_ID des pipes date/number et locale du
    // sélecteur de date — voir core/i18n/provide-i18n.ts et docs/i18n.md.
    ...provideI18n(),
    // Application mobile : barre d'état, bouton retour Android (sans effet sur le web et le bureau).
    provideNativeApp(),
  ],
};
