// Application mobile (Capacitor) — `npm run build:mobile` (configuration production,mobile), embarquée
// dans l'APK. Client léger : même backend Render que la version web. Les origines de la webview
// (https://localhost sur Android, capacitor://localhost sur iOS) figurent dans la liste par défaut
// CORS_ALLOWED_ORIGINS du backend (backend/settings.py).
export const environment = {
  production: true,
  apiBaseUrl: 'https://clinic-backend-p0km.onrender.com/api/v1',
};
