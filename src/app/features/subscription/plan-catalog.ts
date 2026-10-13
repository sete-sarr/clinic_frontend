import { BillingCycle, PlanTier } from '../../core/models/clinic.model';

// Reflète backend/subscriptions/catalog.py (décisions du 2026-09-28 et du 2026-10-14) : francs CFA
// (XOF), deux formules proposées, annuel = 9 mois (3 mois offerts), essai gratuit de 14 jours.
// Professional : modules hospitalisation, laboratoire et pharmacie. Les SMS (désactivés pour
// l'instant, settings.SMS_ENABLED) ne sont pas annoncés. Le montant réellement
// prélevé provient toujours du Stripe Price résolu côté serveur ; ces montants servent uniquement à
// l'affichage et doivent rester alignés sur les Prices créés dans Stripe.
export const CURRENCY_LABEL = 'FCFA';
export const TRIAL_DAYS = 14;
const ANNUAL_MONTHS_BILLED = 9;

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
      'subscription.plans.consultationsAndPrescriptions',
      'subscription.plans.emailNotifications',
    ],
  },
  {
    tier: 'professional',
    label: 'Professional',
    monthlyPriceXof: 15_000,
    maxDoctors: 10,
    maxPatients: 5000,
    // Modules et rappel de la veille réservés à Professional (subscriptions/catalog.py PLAN_FEATURES).
    highlights: [
      'subscription.plans.upTo10Doctors',
      'subscription.plans.upTo5000Patients',
      'subscription.plans.everythingInStarter',
      'subscription.plans.hospitalization',
      'subscription.plans.laboratory',
      'subscription.plans.pharmacy',
      'subscription.plans.dayBeforeReminder',
    ],
  },
];

export function priceForCycle(plan: PlanDefinition, cycle: BillingCycle): number {
  return cycle === 'annual' ? plan.monthlyPriceXof * ANNUAL_MONTHS_BILLED : plan.monthlyPriceXof;
}
