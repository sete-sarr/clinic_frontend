import { translatedLabels } from '../../core/i18n/translated-labels';

// Reflète appointments.api.serializers.AppointmentSerializer et appointments.models.Appointment.Status
// (backend). Les transitions de statut sont imposées côté backend (appointments/services.py) ; le
// frontend expose uniquement les actions autorisées pour le statut/rôle courant, jamais un champ de
// statut libre.
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = translatedLabels<AppointmentStatus>('labels.appointmentStatus', [
  'pending', 'confirmed', 'completed', 'cancelled', 'no_show',
]);

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
  // Rendez-vous de département (rotation) : `doctor` reste null tant qu'aucun médecin du
  // département ne l'a pris en charge ; doctor_display vaut alors « À attribuer — <département> ».
  doctor: number | null;
  doctor_display: string;
  department: number | null;
  department_display: string | null;
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
  // Au moins l'un des deux (appointments/services.py::_resolve_assignment).
  doctor: number | null;
  department: number | null;
  date: string;
  time: string;
  reason: string;
}
