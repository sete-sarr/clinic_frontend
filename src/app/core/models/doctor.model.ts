// Mirrors doctors.api.serializers.DoctorSerializer (backend) — summary fields only,
// enough for pickers/lists.
export interface DoctorSummary {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  specialty: string;
}

// Full record, used by features/doctors/ (list/create/edit) — mirrors DoctorSerializer's complete
// field set, not just the picker-oriented DoctorSummary above.
export interface Doctor extends DoctorSummary {
  clinic: number;
  department: number | null;
  professional_number: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorCreatePayload {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  department: number | null;
  professional_number: string;
  specialty: string;
  phone: string;
}

export interface DoctorUpdatePayload {
  department: number | null;
  professional_number: string;
  specialty: string;
  phone: string;
}
