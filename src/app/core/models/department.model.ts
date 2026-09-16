// Reflète departments.api.serializers.DepartmentSerializer (backend) — champs résumés uniquement,
// suffisants pour les sélecteurs (ex. le select département du formulaire médecin).
export interface DepartmentSummary {
  id: number;
  name: string;
  code: string;
}

// Reflète departments.models.Department.DepartmentType.
export type DepartmentType = 'medical' | 'administrative' | 'technical' | 'support';

export const DEPARTMENT_TYPE_LABELS: Record<DepartmentType, string> = {
  medical: 'Médical',
  administrative: 'Administratif',
  technical: 'Technique',
  support: 'Support',
};

// Reflète departments.models.Department.Status — Actif -> Inactif -> Archivé
// (business/workflow-policy.md). Les départements archivés sont en lecture seule.
export type DepartmentStatus = 'active' | 'inactive' | 'archived';

export const DEPARTMENT_STATUS_LABELS: Record<DepartmentStatus, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  archived: 'Archivé',
};

// Enregistrement complet, utilisé par features/departments/ (list/create/edit) — reflète
// l'ensemble complet des champs de DepartmentSerializer, pas seulement le DepartmentSummary
// ci-dessus orienté sélecteur.
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
