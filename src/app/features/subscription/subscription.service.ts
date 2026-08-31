import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BillingCycle, PlanTier } from '../../core/models/clinic.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/subscriptions/`;

  openBillingPortal(): Observable<{ portal_url: string }> {
    return this.http.post<{ portal_url: string }>(`${this.baseUrl}billing-portal/`, {});
  }

  startCheckout(planTier: PlanTier, billingCycle: BillingCycle): Observable<{ checkout_url: string }> {
    return this.http.post<{ checkout_url: string }>(`${this.baseUrl}checkout-session/`, {
      plan_tier: planTier,
      billing_cycle: billingCycle,
    });
  }
}
