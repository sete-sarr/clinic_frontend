// Mirrors appointments.api.serializers.AppointmentSerializer and appointments.models.Appointment.Status
// (backend). Status transitions are backend-enforced (appointments/services.py); the frontend only
// exposes the actions allowed for the current status/role, never a free status field.
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absence',
};

// business/validation-rules.md "Cancelled appointments remain archived" — no further transition out of these.
export const TERMINAL_APPOINTMENT_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  'completed',
  'cancelled',
  'no_show',
]);

export interface Appointment {
  id: number;
  clinic: number;
  patient: number;
  patient_display: string;
  doctor: number;
  doctor_display: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  reason: string;
  day_before_reminder_sent_at: string | null;
  checked_in_at: string | null;
  ticket_number: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentPayload {
  patient: number;
  doctor: number;
  date: string;
  time: string;
  reason: string;
}
