// Reflète pharmacy.api.serializers.MedicationSerializer (backend).
export interface Medication {
  id: number;
  clinic: number;
  name: string;
  unit: string;
  unit_price: number;
  current_stock: number;
  min_threshold: number;
  max_threshold: number | null;
  low_stock_alerted: boolean;
  overstock_alerted: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicationCreatePayload {
  name: string;
  unit: string;
  unit_price: number;
  min_threshold: number;
  max_threshold: number | null;
}

export type MedicationUpdatePayload = MedicationCreatePayload;

// Reflète pharmacy.api.serializers.StockBatchSerializer (backend). La réception d'un lot passe par
// pharmacy.services.receive_stock_batch côté serveur (crée aussi le StockMovement PURCHASE et
// recalcule Medication.current_stock) — ce payload n'inclut donc jamais quantity_remaining, dérivé.
export interface StockBatch {
  id: number;
  clinic: number;
  medication: number;
  medication_display: string;
  batch_number: string;
  expiry_date: string;
  received_date: string;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  supplier: string;
  created_at: string;
}

export interface StockBatchCreatePayload {
  medication: number;
  batch_number: string;
  expiry_date: string;
  received_date: string;
  quantity_received: number;
  unit_cost: number;
  supplier: string;
}
