// Mirrors medical_records.api.serializers.MedicalRecordSerializer (backend).
// No create (auto-provisioned with the patient) and no delete — see
// medical_records/api/views.py (List/Retrieve/Update only).
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
