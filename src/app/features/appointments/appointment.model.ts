// Reflète appointments.api.serializers.AppointmentSerializer et appointments.models.Appointment.Status
// (backend). Les transitions de statut sont imposées côté backend (appointments/services.py) ; le
// frontend expose uniquement les actions autorisées pour le statut/rôle courant, jamais un champ de
// statut libre.
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absence',
};

// business/validation-rules.md "Cancelled appointments remain archived" — aucune transition
// ultérieure hors de ces statuts.
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
