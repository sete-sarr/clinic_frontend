import { translatedLabels } from '../../core/i18n/translated-labels';
import { CardTone } from '../../shared/components/record-card/record-card.model';

// Reflète laboratory/api/serializers.py (backend). Les champs facultatifs dépendent du rôle :
// prix, facture et consultation ne sont jamais envoyés au technicien ; renseignement clinique et
// historique des corrections jamais au patient.

export type LabOrderStatus = 'requested' | 'collected' | 'in_progress' | 'completed' | 'validated' | 'cancelled';

export const LAB_ORDER_STATUSES: LabOrderStatus[] = [
  'requested', 'collected', 'in_progress', 'completed', 'validated', 'cancelled',
];

export const LAB_ORDER_STATUS_LABELS = translatedLabels<LabOrderStatus>('labels.labOrderStatus', LAB_ORDER_STATUSES);

export const LAB_ORDER_STATUS_TONES: Record<LabOrderStatus, CardTone> = {
  requested: 'warning',
  collected: 'info',
  in_progress: 'info',
  completed: 'warning',
  validated: 'success',
  cancelled: 'neutral',
};

export interface LabTest {
  id: number;
  code: string;
  name: string;
  price: string;
  unit: string;
  reference_min: string | null;
  reference_max: string | null;
  is_active: boolean;
  archived_at: string | null;
}

export interface LabTestPayload {
  code: string;
  name: string;
  price: number;
  unit: string;
  reference_min: number | null;
  reference_max: number | null;
}

export interface LabResult {
  id: number;
  value: string;
  is_abnormal: boolean;
  comment: string;
  entered_by_display: string;
  entered_at: string;
  correction_reason: string;
  superseded_at: string | null;
  attachment_name: string;
}

export interface LabOrderItem {
  id: number;
  test: number;
  test_code: string;
  test_name: string;
  unit: string;
  reference_min: string | null;
  reference_max: string | null;
  price?: string;
  result: LabResult | null;
  history?: LabResult[];
}

export interface LabOrder {
  id: number;
  number: string;
  patient: number;
  patient_display: string;
  doctor: number;
  doctor_display: string;
  consultation?: number | null;
  status: LabOrderStatus;
  clinical_note?: string;
  items: LabOrderItem[];
  has_abnormal: boolean;
  collected_at: string | null;
  completed_at: string | null;
  validated_at: string | null;
  validated_by_display: string;
  cancelled_at: string | null;
  invoice?: number | null;
  invoice_number?: string;
  created_at: string;
}

export interface LabOrderPayload {
  patient: number;
  consultation: number | null;
  tests: number[];
  clinical_note: string;
}

export interface LabResultEntry {
  item: number;
  value: string;
  comment: string;
}

// « 0,70 – 1,10 », « ≥ 0,70 », « ≤ 1,10 » ou « — » (valeurs de référence figées sur la demande).
export function referenceRange(min: string | null, max: string | null): string {
  const format = (value: string) => String(Number(value));
  if (min !== null && max !== null) return `${format(min)} – ${format(max)}`;
  if (min !== null) return `≥ ${format(min)}`;
  if (max !== null) return `≤ ${format(max)}`;
  return '—';
}
