import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const AUTH_ENDPOINTS = [`${environment.apiBaseUrl}/auth/token/`, `${environment.apiBaseUrl}/auth/token/refresh/`];

// Jeton de rafraîchissement refusé par le serveur (expiré, révoqué) : la session est terminée.
// Toute autre erreur (réseau coupé, serveur en cours de démarrage — 502/503…) ne doit pas
// déconnecter l'utilisateur.
function isRejectedRefresh(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 401 || error.status === 400);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const endSession = () => {
    auth.logout();
    router.navigate(['/login']);
  };
  const withToken = (token: string) => req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  const isAuthEndpoint = AUTH_ENDPOINTS.some((url) => req.url.startsWith(url));
  const accessToken = auth.getAccessToken();
  const authorizedReq = accessToken && !isAuthEndpoint ? withToken(accessToken) : req;

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      if (!isUnauthorized || isAuthEndpoint) {
        return throwError(() => error);
      }
      if (!auth.hasRefreshToken()) {
        endSession();
        return throwError(() => error);
      }

      // Jeton déjà renouvelé pendant que cette requête était en vol : la rejouer suffit.
      const currentToken = auth.getAccessToken();
      if (currentToken && currentToken !== accessToken) {
        return next(withToken(currentToken));
      }

      // catchError AVANT switchMap : seules les erreurs du renouvellement peuvent terminer la
      // session, pas celles de la requête rejouée (un 400 de validation, par exemple).
      return auth.refreshAccessToken().pipe(
        catchError((refreshError: unknown) => {
          if (isRejectedRefresh(refreshError)) {
            endSession();
          }
          return throwError(() => refreshError);
        }),
        switchMap((tokens) => next(withToken(tokens.access))),
      );
    }),
  );
};
