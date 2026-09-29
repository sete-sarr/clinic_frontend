import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { AppLanguage, LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../../../core/i18n/languages';

// Sélecteur de langue (docs/i18n.md) — en-tête de l'application et pages publiques. Le choix est
// mémorisé et recharge la page (LanguageService.setLanguage) ; pour un utilisateur connecté, il est
// d'abord enregistré comme sa préférence (e-mails reçus dans cette langue, autres appareils).
@Component({
  selector: 'app-language-switcher',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, TranslocoPipe],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.css',
})
export class LanguageSwitcher {
  private readonly languageService = inject(LanguageService);
  private readonly auth = inject(AuthService);

  protected readonly current = this.languageService.current;
  protected readonly languages = SUPPORTED_LANGUAGES;
  protected readonly labels = LANGUAGE_LABELS;

  protected select(language: AppLanguage): void {
    if (!this.auth.isAuthenticated() || language === this.auth.user()?.language) {
      this.languageService.setLanguage(language);
      return;
    }
    // La bascule a lieu même si l'enregistrement échoue : le choix reste mémorisé sur cet appareil.
    const switchLanguage = () => this.languageService.setLanguage(language);
    this.auth.updateLanguage(language).subscribe({ complete: switchLanguage, error: switchLanguage });
  }
}
