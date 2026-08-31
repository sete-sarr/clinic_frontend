// Mirrors patients.api.serializers.PatientSerializer (backend) — summary fields only,
// enough for pickers/lists. The full record belongs to the future patients feature module.
export interface PatientSummary {
  id: number;
  patient_number: string;
  first_name: string;
  last_name: string;
  phone: string;
}
