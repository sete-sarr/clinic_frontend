import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Publique, statique — peut être pré-rendue sans risque.
  { path: 'login', renderMode: RenderMode.Prerender },
  // Publique, mais interroge l'API clinics en direct au chargement (autocomplétion clinique) — même
  // raisonnement que les routes authentifiées ci-dessous, simplement en rendu client plutôt qu'en
  // pré-rendu/SSR.
  { path: 'activate', renderMode: RenderMode.Client },
  // Tout le reste se trouve derrière authGuard et lit son JWT depuis localStorage (navigateur
  // uniquement, voir core/auth/auth.service.ts), donc cela ne peut jamais être rendu de façon
  // significative côté serveur — rendu client uniquement plutôt que pré-rendu/SSR.
  { path: '**', renderMode: RenderMode.Client },
];
