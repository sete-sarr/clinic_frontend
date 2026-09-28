import { BillingCycle, PlanTier } from '../../core/models/clinic.model';

// Reflète backend/subscriptions/catalog.py (décision métier du 2026-09-28) : francs CFA (XOF), deux
// formules proposées, annuel = 10 mois (2 mois offerts), premier mois gratuit. Le montant réellement
// prélevé provient toujours du Stripe Price résolu côté serveur ; ces montants servent uniquement à
// l'affichage et doivent rester alignés sur les Prices créés dans Stripe.
export const CURRENCY_LABEL = 'FCFA';
export const TRIAL_DAYS = 30;
const ANNUAL_MONTHS_BILLED = 10;

export interface PlanDefinition {
  tier: PlanTier;
  label: string;
  monthlyPriceXof: number;
  maxDoctors: number | null;
  maxPatients: number | null;
  highlights: string[];
}

export const PLAN_CATALOG: PlanDefinition[] = [
  {
    tier: 'starter',
    label: 'Starter',
    monthlyPriceXof: 10_000,
    maxDoctors: 3,
    maxPatients: 500,
    highlights: [
      'Jusqu’à 3 médecins',
      'Jusqu’à 500 patients',
      'Facturation et rendez-vous inclus',
      'Notifications de rendez-vous par e-mail',
    ],
  },
  {
    tier: 'professional',
    label: 'Professional',
    monthlyPriceXof: 15_000,
    maxDoctors: 10,
    maxPatients: 5000,
    // SMS et rappel de la veille : réservés à Professional (subscriptions/catalog.py PLAN_FEATURES).
    highlights: [
      'Jusqu’à 10 médecins',
      'Jusqu’à 5000 patients',
      'Rapports et exports avancés',
      'SMS de rendez-vous aux patients',
      'Rappel automatique la veille du rendez-vous',
    ],
  },
];

export function priceForCycle(plan: PlanDefinition, cycle: BillingCycle): number {
  return cycle === 'annual' ? plan.monthlyPriceXof * ANNUAL_MONTHS_BILLED : plan.monthlyPriceXof;
}
