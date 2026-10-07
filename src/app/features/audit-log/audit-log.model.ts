import { translatedLabels } from '../../core/i18n/translated-labels';

// Reflète common.models.AuditLog.Action et common.api.serializers.AuditLogSerializer (backend).
export type AuditAction =
  | 'create'
  | 'update'
  | 'cancel'
  | 'archive'
  | 'view'
  | 'print'
  | 'export'
  | 'login'
  | 'logout'
  | 'permission_change';

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = translatedLabels<AuditAction>('labels.auditAction', [
  'create', 'update', 'cancel', 'archive', 'view', 'print', 'export', 'login', 'logout', 'permission_change',
]);

// Types d'objets journalisés : nom de classe du modèle backend (common.audit.record_audit, AuditLog.model_name).
const AUDITED_MODELS = [
  'Appointment', 'Clinic', 'Consultation', 'Department', 'Doctor', 'Invoice', 'LabOrder', 'LabTest', 'MedicalRecord', 'Medication', 'Admission', 'Bed', 'Room', 'RoomType', 'VitalSign', 'NursingNote',
  'Patient', 'Payment', 'Prescription', 'StockBatch', 'StockMovement', 'User',
] as const;
const AUDIT_MODEL_LABELS = translatedLabels('labels.auditModel', AUDITED_MODELS);

// Libellé traduit du type d'objet (« Appointment » -> « Rendez-vous ») ; un type inconnu reste affiché tel quel.
export function auditModelLabel(modelName: string): string {
  const known = AUDITED_MODELS.find((model) => model.toLowerCase() === modelName.toLowerCase());
  return known ? AUDIT_MODEL_LABELS[known] : modelName;
}

export interface AuditLogEntry {
  id: number;
  user: number | null;
  user_display: string;
  clinic: number | null;
  action: AuditAction;
  model_name: string;
  object_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
