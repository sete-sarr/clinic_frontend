import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

import { AppLanguage, FALLBACK_LANGUAGE, isAppLanguage, languageFromBrowser } from './languages';

const LANGUAGE_KEY = 'clinic_language';

// Source unique de la langue de l'interface (docs/i18n.md §2-3). La langue est fixée au démarrage
// — LOCALE_ID, la locale du sélecteur de date et Transloco la lisent une fois — et un changement
// recharge la page pour que textes, dates et nombres restent cohérents entre eux.
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly current = signal<AppLanguage>(this.resolveInitialLanguage());

  constructor() {
    this.document.documentElement.lang = this.current();
  }

  // Mémorise le choix puis recharge si la langue change réellement.
  setLanguage(language: AppLanguage): void {
    if (!this.isBrowser) {
      return;
    }
    this.store(language);
    if (language !== this.current()) {
      this.document.defaultView?.location.reload();
    }
  }

  // Après connexion : si l'utilisateur a enregistré une langue différente de l'écran courant, la
  // mémorise et ouvre `url` directement dans cette langue (chargement complet). Renvoie true dans
  // ce cas — l'appelant ne doit alors pas naviguer lui-même.
  openInPreferredLanguage(preference: unknown, url: string): boolean {
    if (!this.isBrowser || !isAppLanguage(preference) || preference === this.current()) {
      return false;
    }
    this.store(preference);
    this.document.defaultView?.location.assign(url);
    return true;
  }

  private resolveInitialLanguage(): AppLanguage {
    if (!this.isBrowser) {
      return FALLBACK_LANGUAGE;
    }
    const stored = this.read();
    if (isAppLanguage(stored)) {
      return stored;
    }
    const navigatorRef = this.document.defaultView?.navigator;
    return languageFromBrowser(navigatorRef?.languages ?? (navigatorRef?.language ? [navigatorRef.language] : []));
  }

  private read(): string | null {
    try {
      return localStorage.getItem(LANGUAGE_KEY);
    } catch {
      return null;
    }
  }

  private store(language: AppLanguage): void {
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      // Stockage indisponible (navigation privée) : la langue du navigateur reste utilisée.
    }
  }
}
