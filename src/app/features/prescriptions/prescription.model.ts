// Mirrors prescriptions.api.serializers.PrescriptionSerializer/PrescriptionItemSerializer
// and prescriptions.models.Prescription.Status (backend).
export type PrescriptionStatus = 'draft' | 'validated' | 'cancelled';

export const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionStatus, string> = {
  draft: 'Brouillon',
  validated: 'Validée',
  cancelled: 'Annulée',
};

// prescriptions/services/__init__.py LOCKED_STATUSES — validated and cancelled are both read-only.
export const LOCKED_PRESCRIPTION_STATUSES: ReadonlySet<PrescriptionStatus> = new Set([
  'validated',
  'cancelled',
]);

export interface PrescriptionItem {
  id?: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
}

export interface Prescription {
  id: number;
  clinic: number;
  consultation: number;
  patient: number;
  patient_display: string;
  doctor: number;
  doctor_display: string;
  status: PrescriptionStatus;
  notes: string;
  items: PrescriptionItem[];
  created_at: string;
  updated_at: string;
}

export interface PrescriptionPayload {
  consultation: number;
  patient: number;
  doctor: number;
  notes: string;
  items: PrescriptionItem[];
}
