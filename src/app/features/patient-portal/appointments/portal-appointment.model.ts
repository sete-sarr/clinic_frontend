// Same shape as AppointmentPayload (appointments/appointment.model.ts) minus `patient` — the
// backend resolves `patient` server-side from request.user.patient_profile for a patient-role
// caller (AppointmentViewSet.perform_create) and ignores/rejects any client-supplied value, so
// it's intentionally not part of this payload type.
export interface PortalAppointmentPayload {
  doctor: number;
  date: string;
  time: string;
  reason: string;
}
