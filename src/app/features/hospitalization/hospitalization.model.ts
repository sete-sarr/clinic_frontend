import { translatedLabels } from '../../core/i18n/translated-labels';
import { CardTone } from '../../shared/components/record-card/record-card.model';

// Reflète hospitalization/api/serializers.py (backend). Les champs facultatifs dépendent du rôle :
// réception = emplacement uniquement ; comptabilité = dates, nuitées, facture ; infirmier = tout le
// clinique, jamais la facture ni les tarifs.

export type BedStatus = 'free' | 'occupied' | 'cleaning' | 'out_of_service';
export type AdmissionStatus = 'planned' | 'admitted' | 'discharged' | 'cancelled';

export const BED_STATUSES: BedStatus[] = ['free', 'occupied', 'cleaning', 'out_of_service'];
export const ADMISSION_STATUSES: AdmissionStatus[] = ['planned', 'admitted', 'discharged', 'cancelled'];

export const BED_STATUS_LABELS = translatedLabels<BedStatus>('labels.bedStatus', BED_STATUSES);
export const ADMISSION_STATUS_LABELS = translatedLabels<AdmissionStatus>('labels.admissionStatus', ADMISSION_STATUSES);

export const BED_STATUS_TONES: Record<BedStatus, CardTone> = {
  free: 'success',
  occupied: 'info',
  cleaning: 'warning',
  out_of_service: 'neutral',
};

export const ADMISSION_STATUS_TONES: Record<AdmissionStatus, CardTone> = {
  planned: 'warning',
  admitted: 'info',
  discharged: 'success',
  cancelled: 'neutral',
};

export interface RoomType {
  id: number;
  name: string;
  nightly_rate?: string;
  is_active: boolean;
}

export interface Room {
  id: number;
  number: string;
  department: number;
  department_name: string;
  room_type: number;
  room_type_name: string;
  is_active: boolean;
}

export interface Bed {
  id: number;
  label: string;
  status: BedStatus;
  room: number;
  room_number: string;
  room_type_name: string;
  department: number;
  department_name: string;
  is_active: boolean;
  current_stay: { id: number; number: string; patient_display: string } | null;
}

export interface BedTransfer {
  from_bed: string;
  to_bed: string;
  transferred_at: string;
  transferred_by: string;
  reason: string;
}

export interface Admission {
  id: number;
  number: string;
  patient: number;
  patient_display: string;
  doctor?: number;
  doctor_display?: string;
  department: number;
  department_name: string;
  bed: number | null;
  room_number: string;
  bed_label: string;
  status: AdmissionStatus;
  reason?: string;
  planned_for: string | null;
  admitted_at: string | null;
  admitted_by_display?: string;
  discharged_at: string | null;
  discharged_by_display?: string;
  discharge_summary?: string;
  nights?: number | null;
  invoice?: number | null;
  invoice_number?: string;
  transfers?: BedTransfer[];
  created_at: string;
}

export interface AdmissionPayload {
  patient: number;
  department: number;
  reason: string;
  planned_for: string | null;
  bed: number | null;
}

export interface VitalSign {
  id: number;
  recorded_at: string;
  temperature: string | null;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  respiratory_rate: number | null;
  oxygen_saturation: number | null;
  weight: string | null;
  pain: number | null;
  recorded_by_display: string;
}

export type VitalSignPayload = Partial<Omit<VitalSign, 'id' | 'recorded_by_display' | 'recorded_at'>>;

export interface NursingNote {
  id: number;
  note: string;
  recorded_at: string;
  recorded_by_display: string;
}

export function bedLocation(bed: Pick<Bed, 'room_number' | 'label'>): string {
  return `${bed.room_number} — ${bed.label}`;
}
