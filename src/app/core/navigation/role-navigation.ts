import { Role } from '../models/user.model';

// Du plus privilégié au moins privilégié : un utilisateur avec plusieurs rôles est présenté (puce de
// l'en-tête, onglets de la barre du bas, page d'arrivée) selon son premier rôle de cette liste.
export const ROLE_PRIORITY: Role[] = [
  'clinic_admin', 'doctor', 'accountant', 'pharmacist', 'lab_technician', 'nurse', 'secretary', 'patient',
];

// Barre du bas sur téléphone (docs/mobile.md § Étape 1) : 4 routes au plus par rôle prioritaire, reprises
// du menu latéral (NAV_ITEMS de shared/layout/shell/shell.ts). La première est aussi la page d'arrivée
// du rôle après la connexion (homeRouteFor).
export const BOTTOM_TABS: Partial<Record<Role, string[]>> = {
  clinic_admin: ['/dashboard', '/patients', '/appointments', '/billing'],
  doctor: ['/dashboard', '/patients', '/appointments', '/consultations'],
  secretary: ['/dashboard', '/patients', '/appointments', '/visitors'],
  accountant: ['/dashboard', '/billing', '/payments', '/hospitalization/stays'],
  nurse: ['/hospitalization', '/notifications'],
  lab_technician: ['/laboratory', '/notifications'],
  pharmacist: ['/pharmacy', '/notifications'],
};

// Rôles qui ont un tableau de bord (backend reports/dashboard) ; les autres n'y verraient qu'une page vide.
export const DASHBOARD_ROLES: Role[] = ['doctor', 'secretary', 'accountant', 'clinic_admin'];

export function primaryRole(roles: readonly Role[]): Role | undefined {
  return ROLE_PRIORITY.find((role) => roles.includes(role));
}

// Page d'arrivée de l'espace du personnel : premier onglet du rôle prioritaire (infirmier →
// hospitalisation, technicien → laboratoire, pharmacien → pharmacie), sinon le tableau de bord.
export function homeRouteFor(roles: readonly Role[]): string {
  const role = primaryRole(roles);
  return (role && BOTTOM_TABS[role]?.[0]) || '/dashboard';
}
