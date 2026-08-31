import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Role } from '../models/user.model';
import { AuthService } from './auth.service';

// Backend remains the source of truth for authorization (business/permissions-matrix.md);
// this guard only avoids rendering a screen the user has no visibility into.
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

// A patient-role user must never render the staff Shell (different app surface entirely —
// business/access-policy.md scopes them to "Own X" everywhere). Applied only to the root Shell
// route; roleGuard itself is untouched since its ~8 existing call sites all want the '/' redirect.
export const staffAreaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasRole('patient')) {
    return router.createUrlTree(['/portal']);
  }
  return true;
};
