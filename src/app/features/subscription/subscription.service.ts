import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BillingCycle, PlanTier } from '../../core/models/clinic.model';

export type SubscriptionPaymentStatus = 'pending' | 'paid' | 'failed' | 'expired';

// Reflète subscriptions.api.views.SubscriptionPaymentSerializer (backend).
export interface SubscriptionPayment {
  id: number;
  plan_tier: PlanTier;
  billing_cycle: BillingCycle;
  amount: string;
  charged_amount: string | null;
  currency: string;
  status: SubscriptionPaymentStatus;
  network: string;
  provider_reference: string;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

// GET /subscriptions/overview/ : mode de paiement et historique.
export interface SubscriptionOverview {
  provider: 'saspay' | 'stripe';
  trial_days: number;
  grace_days: number;
  annual_months_billed: number;
  payments: SubscriptionPayment[];
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/subscriptions/`;

  openBillingPortal(): Observable<{ portal_url: string }> {
    return this.http.post<{ portal_url: string }>(`${this.baseUrl}billing-portal/`, {});
  }

  // Abonnement Stripe en cours : modifie l'abonnement existant (jamais un second abonnement).
  changePlan(planTier: PlanTier, billingCycle: BillingCycle): Observable<{ plan_tier: PlanTier; billing_cycle: BillingCycle }> {
    return this.http.post<{ plan_tier: PlanTier; billing_cycle: BillingCycle }>(`${this.baseUrl}change-plan/`, {
      plan_tier: planTier,
      billing_cycle: billingCycle,
    });
  }

  // Page de paiement (SasPay ou Stripe). Le montant est toujours calculé par le serveur.
  startCheckout(planTier: PlanTier, billingCycle: BillingCycle): Observable<{ checkout_url: string; payment_id?: number }> {
    return this.http.post<{ checkout_url: string; payment_id?: number }>(`${this.baseUrl}checkout-session/`, {
      plan_tier: planTier,
      billing_cycle: billingCycle,
    });
  }

  // Au retour de la page de paiement : revérification auprès de SasPay.
  refreshPayment(paymentId: number): Observable<SubscriptionPayment> {
    return this.http.post<SubscriptionPayment>(`${this.baseUrl}payments/${paymentId}/refresh/`, {});
  }
}
