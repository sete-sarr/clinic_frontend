// Mirrors departments.api.serializers.DepartmentSerializer (backend) — summary fields only,
// enough for pickers (e.g. the doctor form's department select).
export interface DepartmentSummary {
  id: number;
  name: string;
  code: string;
}

// Mirrors departments.models.Department.DepartmentType.
export type DepartmentType = 'medical' | 'administrative' | 'technical' | 'support';

export const DEPARTMENT_TYPE_LABELS: Record<DepartmentType, string> = {
  medical: 'Médical',
  administrative: 'Administratif',
  technical: 'Technique',
  support: 'Support',
};

// Mirrors departments.models.Department.Status — Actif -> Inactif -> Archivé
// (business/workflow-policy.md). Archived departments are read-only.
export type DepartmentStatus = 'active' | 'inactive' | 'archived';

export const DEPARTMENT_STATUS_LABELS: Record<DepartmentStatus, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  archived: 'Archivé',
};

// Full record, used by features/departments/ (list/create/edit) — mirrors DepartmentSerializer's
// complete field set, not just the picker-oriented DepartmentSummary above.
export interface Department extends DepartmentSummary {
  clinic: number;
  department_type: DepartmentType;
  description: string;
  status: DepartmentStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentCreatePayload {
  name: string;
  code: string;
  department_type: DepartmentType;
  description: string;
}

export type DepartmentUpdatePayload = DepartmentCreatePayload;
