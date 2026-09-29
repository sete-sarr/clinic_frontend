import { TranslocoTestingModule } from '@jsverse/transloco';

import en from '../../i18n/en.json';
import fr from '../../i18n/fr.json';
import { AppLanguage } from './languages';

// Transloco pour les tests unitaires, avec les vraies traductions chargées de façon synchrone.
export function translocoTesting(language: AppLanguage = 'fr') {
  return TranslocoTestingModule.forRoot({
    langs: { fr, en },
    translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: language },
    preloadLangs: true,
  });
}
