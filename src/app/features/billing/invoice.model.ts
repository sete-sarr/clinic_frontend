import { translatedLabels } from '../../core/i18n/translated-labels';

// Reflète billing.api.serializers.InvoiceSerializer/InvoiceLineSerializer et
// billing.models.Invoice.Status (backend).
export type InvoiceStatus = 'draft' | 'issued' | 'pending_payment' | 'paid' | 'cancelled';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = translatedLabels<InvoiceStatus>('labels.invoiceStatus', [
  'draft', 'issued', 'pending_payment', 'paid', 'cancelled',
]);

// billing/services/__init__.py LOCKED_STATUSES.
export const LOCKED_INVOICE_STATUSES: ReadonlySet<InvoiceStatus> = new Set(['paid', 'cancelled']);

export const DEFAULT_VAT_RATE = 0.18;

export interface InvoiceLine {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  line_total?: string;
  // Ligne liée au catalogue pharmacie : le stock est décrémenté à l'émission de la facture
  // (pharmacy/services.py::sync_invoice_stock). null = prestation sans article de stock.
  medication: number | null;
}

export interface Invoice {
  id: number;
  clinic: number;
  patient: number;
  patient_display: string;
  doctor: number | null;
  doctor_display: string;
  number: string;
  issue_date: string;
  subtotal: string;
  vat_rate: string;
  vat_amount: string;
  total_amount: string;
  status: InvoiceStatus;
  amount_paid: string;
  balance_due: string;
  lines: InvoiceLine[];
  created_at: string;
  updated_at: string;
}

export interface InvoicePayload {
  patient: number;
  doctor: number | null;
  issue_date: string;
  vat_rate: number;
  lines: InvoiceLine[];
}
