// Reflète medical_records.api.serializers.MedicalRecordSerializer (backend).
// Pas de création (provisionné automatiquement avec le patient) et pas de suppression — voir
// medical_records/api/views.py (List/Retrieve/Update uniquement).
export interface MedicalRecord {
  id: number;
  clinic: number;
  patient: number;
  patient_display: string;
  allergies: string;
  medical_history: string;
  observations: string;
  created_at: string;
  updated_at: string;
}

export interface MedicalRecordPayload {
  allergies: string;
  medical_history: string;
  observations: string;
}
