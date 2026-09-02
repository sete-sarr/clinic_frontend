// Mirrors accounts.api.serializers.UserSerializer / TokenObtainPairSerializer (backend).
// Role vocabulary matches backend/accounts/migrations/0002_seed_roles.py — see CLAUDE.md's
// role-vocabulary note (secretary ≈ receptionist, accountant ≈ cashier until unified).
export type Role = 'doctor' | 'secretary' | 'accountant' | 'clinic_admin' | 'patient';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  clinic: number | null;
  roles: Role[];
  doctor_id: number | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ClinicRegistration {
  clinic_name: string;
  clinic_email: string;
  clinic_phone: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
}
