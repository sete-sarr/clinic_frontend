// Surcharge locale uniquement (ignorée par git, jamais committée) — pointe le frontend vers un backend
// tournant en local plutôt que vers le backend Render déployé qu'utilisent par défaut
// environment.ts/environment.development.ts. À utiliser avec `ng serve --configuration=local`.
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000/api/v1',
};
