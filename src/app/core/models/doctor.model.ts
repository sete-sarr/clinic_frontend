// Reflète doctors.api.serializers.DoctorSerializer (backend) — champs résumés uniquement,
// suffisants pour les sélecteurs/listes.
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

// Enregistrement complet, utilisé par features/doctors/ (list/create/edit) — reflète l'ensemble
// complet des champs de DoctorSerializer, pas seulement le DoctorSummary ci-dessus orienté
// sélecteur.
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
