// Local-only override (gitignored, never committed) — points the frontend at a locally-running
// backend instead of the deployed Render backend that environment.ts/environment.development.ts
// use by default. Use with `ng serve --configuration=local`.
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000/api/v1',
};
