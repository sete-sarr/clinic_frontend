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
