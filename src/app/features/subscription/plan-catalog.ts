import { BillingCycle, PlanTier } from '../../core/models/clinic.model';

// Mirrors backend/subscriptions/catalog.py::PLAN_LIMITS. PLACEHOLDER pricing — indicative only,
// pending real business sign-off (business/subscription-billing-policy.md). The actual charge
// always comes from the Stripe Price resolved server-side; these $ figures are UI-display-only.
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

// Annual pricing mirrors the x10 (2 months free) factor used when the Stripe Prices were created.
export function indicativeAnnualUsd(plan: PlanDefinition): number {
  return plan.indicativeMonthlyUsd * 10;
}

export function indicativePriceForCycle(plan: PlanDefinition, cycle: BillingCycle): number {
  return cycle === 'annual' ? indicativeAnnualUsd(plan) : plan.indicativeMonthlyUsd;
}
