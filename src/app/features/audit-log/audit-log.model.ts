// Mirrors common.models.AuditLog.Action and common.api.serializers.AuditLogSerializer (backend).
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

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Création',
  update: 'Modification',
  cancel: 'Annulation',
  archive: 'Archivage',
  view: 'Consultation',
  print: 'Impression',
  export: 'Export',
  login: 'Connexion',
  logout: 'Déconnexion',
  permission_change: 'Changement de permission',
};

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
