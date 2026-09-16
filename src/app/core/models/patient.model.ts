// Reflète patients.api.serializers.PatientSerializer (backend) — champs résumés uniquement,
// suffisants pour les sélecteurs/listes. L'enregistrement complet relève du futur module
// fonctionnel patients.
export interface PatientSummary {
  id: number;
  patient_number: string;
  first_name: string;
  last_name: string;
  phone: string;
}
