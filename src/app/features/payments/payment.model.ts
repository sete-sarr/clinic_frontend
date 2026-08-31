// Mirrors payments.api.serializers.PaymentSerializer and payments.models.Payment (backend).
// No update, no delete — payments are immutable once created (business/permissions-matrix.md);
// the only allowed transition is validated -> refunded via the dedicated refund action.
export type PaymentMethod = 'cash' | 'mobile_money' | 'card';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  mobile_money: 'Mobile money',
  card: 'Carte',
};

export type PaymentStatus = 'pending' | 'validated' | 'refunded';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'En attente',
  validated: 'Validé',
  refunded: 'Remboursé',
};

export interface Payment {
  id: number;
  clinic: number;
  invoice: number;
  invoice_number: string;
  patient_display: string;
  amount: string;
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
