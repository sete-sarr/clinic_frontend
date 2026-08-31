import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Public, static — safe to prerender.
  { path: 'login', renderMode: RenderMode.Prerender },
  // Public, but fetches from the live clinics API on load (clinic autocomplete) — same reasoning
  // as the authenticated routes below, just client-render rather than prerender/SSR.
  { path: 'activate', renderMode: RenderMode.Client },
  // Everything else lives behind authGuard and reads its JWT from localStorage (browser-only,
  // see core/auth/auth.service.ts), so it can never be meaningfully rendered on the server —
  // client-render only rather than prerender/SSR.
  { path: '**', renderMode: RenderMode.Client },
];
