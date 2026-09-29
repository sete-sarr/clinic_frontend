import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { Observable, from } from 'rxjs';

import { AppLanguage } from './languages';

// Traductions intégrées au build (import dynamique → un fichier par langue, avec empreinte de
// contenu) plutôt que servies depuis public/ : un déploiement ne peut jamais servir une ancienne
// traduction restée en cache, et aucune requête HTTP ne passe par l'intercepteur d'authentification.
const TRANSLATIONS: Record<AppLanguage, () => Promise<{ default: Translation }>> = {
  fr: () => import('../../i18n/fr.json'),
  en: () => import('../../i18n/en.json'),
};

@Injectable({ providedIn: 'root' })
export class AppTranslocoLoader implements TranslocoLoader {
  getTranslation(language: string): Observable<Translation> {
    const load = TRANSLATIONS[language as AppLanguage] ?? TRANSLATIONS.fr;
    return from(load().then((module) => module.default));
  }
}
