// Unité d'une quantité saisie (réception, ligne de facture) : conditionnement (boîte…) ou unité de
// base (comprimé…) — backend pharmacy.models.SaleUnit.
export type SaleUnit = 'pack' | 'unit';

// Reflète pharmacy.api.serializers.MedicationSerializer (backend). Le stock et les seuils sont en
// unités de base (`unit`) ; le conditionnement n'est qu'un facteur de conversion (`units_per_pack`,
// 1 pour un produit qui ne se détaille pas).
export interface Medication {
  id: number;
  clinic: number;
  name: string;
  unit: string;
  unit_price: number;
  pack_unit: string;
  units_per_pack: number;
  pack_price: number;
  allow_unit_sale: boolean;
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
  pack_unit: string;
  units_per_pack: number;
  pack_price: number;
  allow_unit_sale: boolean;
  min_threshold: number;
  max_threshold: number | null;
}

// « Détailler le stock » (backend split_medication_packs) : le médicament, jusqu'ici compté par
// conditionnement, passe à une unité de base plus fine.
export interface SplitPacksPayload {
  units_per_pack: number;
  unit: string;
  unit_price: number;
  allow_unit_sale: boolean;
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
  received_in: SaleUnit;
  units_per_pack: number;
  // En unités de base.
  quantity_received: number;
  quantity_remaining: number;
  // Coût de l'unité saisie (conditionnement ou unité).
  unit_cost: number;
  supplier: string;
  created_at: string;
}

export interface StockBatchCreatePayload {
  medication: number;
  batch_number: string;
  expiry_date: string;
  received_date: string;
  // Quantité dans l'unité `received_in`, convertie en unités de base par le serveur.
  quantity: number;
  received_in: SaleUnit;
  unit_cost: number;
  supplier: string;
}

export function isPackaged(medication: Pick<Medication, 'units_per_pack'>): boolean {
  return medication.units_per_pack > 1;
}

// Quantité saisie dans `saleUnit` -> unités de base (même calcul que Medication.units_for).
export function unitsFor(medication: Pick<Medication, 'units_per_pack'>, quantity: number, saleUnit: SaleUnit): number {
  return saleUnit === 'pack' ? quantity * medication.units_per_pack : quantity;
}

// Stock lisible : « 9 × boîte + 47 × comprimé » pour un produit conditionné (unités en texte libre,
// d'où la notation « × » plutôt qu'un pluriel), le simple nombre sinon.
export function formatStock(
  medication: Pick<Medication, 'units_per_pack' | 'pack_unit' | 'unit'>,
  quantity: number,
): string {
  if (!isPackaged(medication) || quantity === 0) {
    return String(quantity);
  }
  const packs = Math.floor(quantity / medication.units_per_pack);
  const units = quantity % medication.units_per_pack;
  const parts = [];
  if (packs) {
    parts.push(`${packs} × ${medication.pack_unit}`);
  }
  if (units || !packs) {
    parts.push(`${units} × ${medication.unit}`);
  }
  return parts.join(' + ');
}
