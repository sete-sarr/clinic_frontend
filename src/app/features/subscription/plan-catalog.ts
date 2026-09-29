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
  highlights: string[]; // clés de traduction (i18n/*.json → subscription.plans.*)
}

export const PLAN_CATALOG: PlanDefinition[] = [
  {
    tier: 'starter',
    label: 'Starter',
    monthlyPriceXof: 10_000,
    maxDoctors: 3,
    maxPatients: 500,
    highlights: [
      'subscription.plans.upTo3Doctors',
      'subscription.plans.upTo500Patients',
      'subscription.plans.billingAndAppointments',
      'subscription.plans.emailNotifications',
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
      'subscription.plans.upTo10Doctors',
      'subscription.plans.upTo5000Patients',
      'subscription.plans.advancedReports',
      'subscription.plans.smsNotifications',
      'subscription.plans.dayBeforeReminder',
    ],
  },
];

export function priceForCycle(plan: PlanDefinition, cycle: BillingCycle): number {
  return cycle === 'annual' ? plan.monthlyPriceXof * ANNUAL_MONTHS_BILLED : plan.monthlyPriceXof;
}
