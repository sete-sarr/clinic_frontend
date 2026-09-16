import { Role } from './user.model';

// Reflète accounts.api.serializers.StaffListSerializer/StaffCreateSerializer (backend). Assignable
// uniquement via l'écran staff — "doctor" (modèle de profil propre, géré sous /doctors) et
// "patient" (flux d'activation OTP propre) sont exclus, conformément à
// accounts.services.STAFF_ROLES_ASSIGNABLE.
export type StaffRole = Extract<Role, 'secretary' | 'accountant' | 'clinic_admin'>;

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  secretary: 'Secrétaire',
  accountant: 'Comptable',
  clinic_admin: 'Administrateur de clinique',
};

export interface StaffMember {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: StaffRole;
  is_active: boolean;
  date_joined: string;
}

export interface StaffCreatePayload {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: StaffRole;
}

export interface StaffUpdatePayload {
  first_name: string;
  last_name: string;
  email: string;
}
