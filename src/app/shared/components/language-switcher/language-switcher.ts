import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslocoPipe } from '@jsverse/transloco';

import { LanguageService } from '../../../core/i18n/language.service';
import { AppLanguage, LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../../../core/i18n/languages';

// Sélecteur de langue (docs/i18n.md) — en-tête de l'application et pages publiques. Le choix est
// mémorisé et recharge la page (LanguageService.setLanguage).
@Component({
  selector: 'app-language-switcher',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, TranslocoPipe],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.css',
})
export class LanguageSwitcher {
  private readonly languageService = inject(LanguageService);

  protected readonly current = this.languageService.current;
  protected readonly languages = SUPPORTED_LANGUAGES;
  protected readonly labels = LANGUAGE_LABELS;

  protected select(language: AppLanguage): void {
    this.languageService.setLanguage(language);
  }
}
