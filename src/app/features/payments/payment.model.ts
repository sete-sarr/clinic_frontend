import { translatedLabels } from '../../core/i18n/translated-labels';

// Reflète payments.api.serializers.PaymentSerializer et payments.models.Payment (backend).
// Aucune mise à jour, aucune suppression — les paiements sont immuables une fois créés (business/permissions-matrix.md) ;
// la seule transition autorisée est validated -> refunded via l'action dédiée de remboursement.
export type PaymentMethod = 'cash' | 'mobile_money' | 'card';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = translatedLabels<PaymentMethod>('labels.paymentMethod', [
  'cash', 'mobile_money', 'card',
]);

export type PaymentStatus = 'pending' | 'validated' | 'refunded';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = translatedLabels<PaymentStatus>('labels.paymentStatus', [
  'pending', 'validated', 'refunded',
]);

export interface Payment {
  id: number;
  clinic: number;
  invoice: number;
  invoice_number: string;
  patient_display: string;
  amount: string;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  date: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentPayload {
  invoice: number;
  amount: number;
  method: PaymentMethod;
  date: string;
}
