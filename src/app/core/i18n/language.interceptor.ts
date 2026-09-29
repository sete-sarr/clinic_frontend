import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { LanguageService } from './language.service';

// Indique à l'API la langue de l'interface : Django (LocaleMiddleware) répond dans cette langue —
// messages d'erreur compris (docs/i18n.md §4). Limité aux appels vers notre API.
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }
  const language = inject(LanguageService).current();
  return next(req.clone({ setHeaders: { 'Accept-Language': language } }));
};
