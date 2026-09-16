// Même forme qu'AppointmentPayload (appointments/appointment.model.ts) sans `patient` — le
// backend résout `patient` côté serveur à partir de request.user.patient_profile pour un appelant
// de rôle patient (AppointmentViewSet.perform_create) et ignore/rejette toute valeur fournie par le
// client, donc il est volontairement exclu de ce type de payload.
export interface PortalAppointmentPayload {
  doctor: number;
  date: string;
  time: string;
  reason: string;
}
