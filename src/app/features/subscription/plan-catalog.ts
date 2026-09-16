import { BillingCycle, PlanTier } from '../../core/models/clinic.model';

// Reflète backend/subscriptions/catalog.py::PLAN_LIMITS. Tarification TEMPORAIRE — indicative seulement,
// en attente de validation métier réelle (business/subscription-billing-policy.md). Le montant réellement
// facturé provient toujours du Stripe Price résolu côté serveur ; ces montants en $ sont uniquement d'affichage UI.
export interface PlanDefinition {
  tier: PlanTier;
  label: string;
  indicativeMonthlyUsd: number;
  maxDoctors: number | null;
  maxPatients: number | null;
  highlights: string[];
}

export const PLAN_CATALOG: PlanDefinition[] = [
  {
    tier: 'starter',
    label: 'Starter',
    indicativeMonthlyUsd: 29,
    maxDoctors: 3,
    maxPatients: 500,
    highlights: ['Jusqu’à 3 médecins', 'Jusqu’à 500 patients', 'Facturation et rendez-vous inclus'],
  },
  {
    tier: 'professional',
    label: 'Professional',
    indicativeMonthlyUsd: 79,
    maxDoctors: 10,
    maxPatients: 5000,
    highlights: ['Jusqu’à 10 médecins', 'Jusqu’à 5000 patients', 'Rapports et exports avancés'],
  },
  {
    tier: 'enterprise',
    label: 'Enterprise',
    indicativeMonthlyUsd: 199,
    maxDoctors: null,
    maxPatients: null,
    highlights: ['Médecins illimités', 'Patients illimités', 'Support prioritaire'],
  },
];

// La tarification annuelle reflète le facteur x10 (2 mois offerts) utilisé lors de la création des Stripe Prices.
export function indicativeAnnualUsd(plan: PlanDefinition): number {
  return plan.indicativeMonthlyUsd * 10;
}

export function indicativePriceForCycle(plan: PlanDefinition, cycle: BillingCycle): number {
  return cycle === 'annual' ? indicativeAnnualUsd(plan) : plan.indicativeMonthlyUsd;
}
