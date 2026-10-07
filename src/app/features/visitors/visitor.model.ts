import { translatedLabels } from '../../core/i18n/translated-labels';

// Reflète visitors/api/serializers.py (backend). Aucune pièce d'identité ni photo (RGPD).
export type VisitorType = 'patient_visit' | 'companion' | 'supplier' | 'contractor' | 'other';

export const VISITOR_TYPES: VisitorType[] = ['patient_visit', 'companion', 'supplier', 'contractor', 'other'];
export const VISITOR_TYPE_LABELS = translatedLabels<VisitorType>('labels.visitorType', VISITOR_TYPES);

export interface Visit {
  id: number;
  visitor_name: string;
  visitor_phone: string;
  visitor_type: VisitorType;
  purpose: string;
  visited_admission: number | null;
  visited_staff: number | null;
  visited_free_text: string;
  visited_display: string;
  checked_in_at: string;
  checked_in_by_display: string;
  checked_out_at: string | null;
  checked_out_by_display: string;
  auto_closed: boolean;
  is_present: boolean;
}

export type VisitPayload = Pick<
  Visit,
  'visitor_name' | 'visitor_phone' | 'visitor_type' | 'purpose' | 'visited_admission' | 'visited_staff' | 'visited_free_text'
>;

export interface VisitTarget {
  id: number;
  label: string;
}

// Personnes visitables : patients hospitalisés (nom + emplacement, jamais le motif) et personnel.
export interface VisitTargets {
  admissions: VisitTarget[];
  staff: VisitTarget[];
}
