export const environment = {
  production: true,
  // Adresse Render du backend (exemple_prod.md § « Adresse de l'API »). Un chemin relatif ne fonctionnerait
  // que si le frontend et le backend partageaient une même origine — ici app.procli.org et l'API Render
  // sont deux domaines séparés.
  apiBaseUrl: 'https://clinic-backend-p0km.onrender.com/api/v1',
};
