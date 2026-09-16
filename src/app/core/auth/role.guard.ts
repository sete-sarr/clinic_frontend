import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Role } from '../models/user.model';
import { AuthService } from './auth.service';

// Le backend reste la source de vérité pour l'autorisation (business/permissions-matrix.md) ;
// ce guard évite seulement d'afficher un écran auquel l'utilisateur n'a pas accès en visibilité.
export function roleGuard(...allowed: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.hasRole(...allowed)) {
      return true;
    }

    return router.createUrlTree(['/']);
  };
}

// Un utilisateur ayant le rôle patient ne doit jamais afficher le Shell staff (surface applicative
// entièrement différente — business/access-policy.md les limite partout à "Own X"). Appliqué
// uniquement à la route racine Shell ; roleGuard lui-même n'est pas modifié puisque ses ~8 sites
// d'appel existants veulent tous la redirection vers '/'.
export const staffAreaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasRole('patient')) {
    return router.createUrlTree(['/portal']);
  }
  return true;
};
