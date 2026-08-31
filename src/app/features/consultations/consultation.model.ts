// Mirrors consultations.api.serializers.ConsultationSerializer and
// consultations.models.Consultation.Status (backend).
export type ConsultationStatus = 'draft' | 'completed' | 'validated';

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  draft: 'Brouillon',
  completed: 'Terminée',
  validated: 'Validée',
};

// business/validation-rules.md "Validated consultations become read-only" —
// consultations/services.py currently offers no reopen path, admin or otherwise.
export const LOCKED_CONSULTATION_STATUSES: ReadonlySet<ConsultationStatus> = new Set(['validated']);

export interface Consultation {
  id: number;
  clinic: number;
  patient: number;
  patient_display: string;
  doctor: number;
  doctor_display: string;
  appointment: number | null;
  date: string;
  is_follow_up: boolean;
  chief_complaint: string;
  diagnosis: string;
  treatment_plan: string;
  status: ConsultationStatus;
  created_at: string;
  updated_at: string;
}

export interface ConsultationPayload {
  patient: number;
  doctor: number;
  appointment: number | null;
  date: string;
  is_follow_up: boolean;
  chief_complaint: string;
  diagnosis: string;
  treatment_plan: string;
}
