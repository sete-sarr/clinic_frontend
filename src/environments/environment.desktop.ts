// Application de bureau (Tauri) — `npm run build:desktop` (configuration production,desktop), embarquée
// dans l'exécutable par `npm run desktop:build`. Client léger : l'interface tourne localement mais parle
// au même backend Render que la version web. L'origine Tauri (http://tauri.localhost) figure dans la
// liste par défaut CORS_ALLOWED_ORIGINS du backend (backend/settings.py).
export const environment = {
  production: true,
  apiBaseUrl: 'https://clinic-backend-p0km.onrender.com/api/v1',
};
