// Mirrors patients.api.serializers.PatientSerializer and patients.models.Patient (backend).
export type Gender = 'male' | 'female' | 'other';

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Homme',
  female: 'Femme',
  other: 'Autre',
};

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';

export const BLOOD_TYPE_LABELS: Record<BloodType, string> = {
  'A+': 'A+',
  'A-': 'A-',
  'B+': 'B+',
  'B-': 'B-',
  'AB+': 'AB+',
  'AB-': 'AB-',
  'O+': 'O+',
  'O-': 'O-',
  unknown: 'Inconnu',
};

export interface Patient {
  id: number;
  clinic: number;
  patient_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: Gender;
  blood_type: BloodType;
  national_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientPayload {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: Gender;
  blood_type: BloodType;
  national_id: string;
}
