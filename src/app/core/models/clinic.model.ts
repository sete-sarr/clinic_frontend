// Mirrors clinics.api.serializers.ClinicSerializer (backend).
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled';
export type PlanTier = 'starter' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trial: 'Essai',
  active: 'Actif',
  past_due: 'Paiement en retard',
  suspended: 'Suspendu',
  cancelled: 'Annulé',
};

export const PLAN_TIER_LABELS: Record<PlanTier, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

export type Locale = 'fr' | 'en';

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
};

export interface Clinic {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subscription_status: SubscriptionStatus;
  plan_tier: PlanTier;
  billing_cycle: BillingCycle;
  trial_ends_at: string | null;
  current_period_end: string | null;
  locale: Locale;
  logo_light: string | null;
  logo_dark: string | null;
  logo_print: string | null;
  favicon: string | null;
}
