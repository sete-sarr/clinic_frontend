export const environment = {
  production: true,
  // Remplacer par la véritable URL du backend Render avant le déploiement (exemple_prod.md §3), par ex.
  // 'https://clinic-backend.onrender.com/api/v1'. Un chemin relatif ne fonctionne que si le frontend et
  // le backend partagent une même origine, ce qui n'est pas le cas avec Vercel + Render en domaines séparés.
  apiBaseUrl: 'https://clinic-backend-p0km.onrender.com/api/v1',
};
