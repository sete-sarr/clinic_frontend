import { translatedLabels } from '../../core/i18n/translated-labels';

// Reflète patients.api.serializers.PatientSerializer et patients.models.Patient (backend).
export type Gender = 'male' | 'female' | 'other';

export const GENDER_LABELS: Record<Gender, string> = translatedLabels<Gender>('labels.gender', [
  'male', 'female', 'other',
]);

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';

export const BLOOD_TYPE_LABELS: Record<BloodType, string> = translatedLabels<BloodType>('labels.bloodType', [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown',
]);

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
