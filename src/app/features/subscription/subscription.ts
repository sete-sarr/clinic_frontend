// import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
// import { httpResource } from '@angular/common/http';
// import { Component, computed, inject, signal } from '@angular/core';
// import { MatButtonModule } from '@angular/material/button';
// import { MatButtonToggleModule } from '@angular/material/button-toggle';
// import { MatCardModule } from '@angular/material/card';
// import { MatChipsModule } from '@angular/material/chips';
// import { MatIconModule } from '@angular/material/icon';
// import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// import { ActivatedRoute, Router } from '@angular/router';
// import { firstValueFrom } from 'rxjs';

// import { environment } from '../../../environments/environment';
// import { parseApiError } from '../../core/api/api-error';
// import { AuthService } from '../../core/auth/auth.service';
// import {
//   BillingCycle,
//   Clinic,
//   PlanTier,
//   SUBSCRIPTION_STATUS_LABELS,
// } from '../../core/models/clinic.model';
// import { SuccessNotifier } from '../../shared/notifications/success-notifier';
// import { PLAN_CATALOG, indicativePriceForCycle } from './plan-catalog';
// import { SubscriptionService } from './subscription.service';

// @Component({
//   selector: 'app-subscription',
//   imports: [
//     DatePipe,
//     DecimalPipe,
//     TitleCasePipe,
//     MatButtonModule,
//     MatButtonToggleModule,
//     MatCardModule,
//     MatChipsModule,
//     MatIconModule,
//     MatProgressSpinnerModule,
//   ],
//   templateUrl: './subscription.html',
//   styleUrl: './subscription.css',
// })
// export class Subscription {
//   private readonly auth = inject(AuthService);
//   private readonly subscriptionService = inject(SubscriptionService);
//   private readonly successNotifier = inject(SuccessNotifier);
//   private readonly route = inject(ActivatedRoute);
//   private readonly router = inject(Router);

//   protected readonly plans = PLAN_CATALOG;
//   protected readonly statusLabels = SUBSCRIPTION_STATUS_LABELS;
//   protected readonly indicativePriceForCycle = indicativePriceForCycle;

//   protected readonly billingCycle = signal<BillingCycle>('monthly');
//   protected readonly working = signal<PlanTier | 'portal' | null>(null);
//   protected readonly errorMessage = signal<string | null>(null);

//   private readonly clinicId = computed(() => this.auth.user()?.clinic ?? null);

//   protected readonly clinicResource = httpResource<Clinic | null>(
//     () => {
//       const id = this.clinicId();
//       return id ? { url: `${environment.apiBaseUrl}/clinics/${id}/` } : undefined;
//     },
//     { defaultValue: null },
//   );

//   private static readonly CHECKOUT_NOTICES = {
//     success: { kind: 'success' as const, message: 'Paiement confirmé — votre abonnement est en cours de mise à jour.' },
//     cancelled: { kind: 'cancelled' as const, message: 'Le paiement a été annulé. Aucun changement n’a été effectué.' },
//   };

//   protected readonly checkoutNotice = signal(
//     Subscription.CHECKOUT_NOTICES[this.route.snapshot.queryParamMap.get('checkout') as 'success' | 'cancelled'] ?? null,
//   );

//   protected isCurrentPlan(tier: PlanTier): boolean {
//     const clinic = this.clinicResource.value();
//     return !!clinic && clinic.plan_tier === tier && clinic.subscription_status !== 'cancelled';
//   }

//   protected async selectPlan(tier: PlanTier): Promise<void> {
//     this.errorMessage.set(null);
//     this.working.set(tier);
//     try {
//       const result = await firstValueFrom(this.subscriptionService.startCheckout(tier, this.billingCycle()));
//       window.location.href = result.checkout_url;
//     } catch (error) {
//       const apiError = parseApiError(error, "Impossible de démarrer le paiement pour l'instant.");
//       this.errorMessage.set(apiError.message);
//       this.working.set(null);
//     }
//   }

//   protected async manageBilling(): Promise<void> {
//     this.errorMessage.set(null);
//     this.working.set('portal');
//     try {
//       const result = await firstValueFrom(this.subscriptionService.openBillingPortal());
//       window.location.href = result.portal_url;
//     } catch (error) {
//       const apiError = parseApiError(error, "Impossible d'ouvrir la gestion de l'abonnement.");
//       this.errorMessage.set(apiError.message);
//       this.working.set(null);
//     }
//   }

//   protected dismissNotice(): void {
//     this.checkoutNotice.set(null);
//     this.router.navigate([], { relativeTo: this.route, queryParams: {} });
//   }
// }


import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { parseApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import {
  BillingCycle,
  Clinic,
  PlanTier,
  SUBSCRIPTION_STATUS_LABELS,
} from '../../core/models/clinic.model';
import { SuccessNotifier } from '../../shared/notifications/success-notifier';
import { PLAN_CATALOG, indicativePriceForCycle } from './plan-catalog';
import { SubscriptionService } from './subscription.service';

type CheckoutNotice =
  | {
      kind: 'success';
      message: string;
    }
  | {
      kind: 'cancelled';
      message: string;
    };

@Component({
  selector: 'app-subscription',
  imports: [
    DatePipe,
    DecimalPipe,
    TitleCasePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './subscription.html',
  styleUrl: './subscription.css',
})
export class Subscription {
  private readonly auth = inject(AuthService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly successNotifier = inject(SuccessNotifier);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly plans = PLAN_CATALOG;
  protected readonly statusLabels = SUBSCRIPTION_STATUS_LABELS;
  protected readonly indicativePriceForCycle = indicativePriceForCycle;

  protected readonly billingCycle = signal<BillingCycle>('monthly');

  protected readonly working = signal<PlanTier | 'portal' | null>(null);

  protected readonly errorMessage = signal<string | null>(null);

  private readonly clinicId = computed(
    () => this.auth.user()?.clinic ?? null,
  );

  protected readonly clinicResource = httpResource<Clinic | null>(
    () => {
      const id = this.clinicId();

      return id
        ? {
            url: `${environment.apiBaseUrl}/clinics/${id}/`,
          }
        : undefined;
    },
    {
      defaultValue: null,
    },
  );

  private static readonly CHECKOUT_NOTICES = {
    success: {
      kind: 'success' as const,
      message:
        'Paiement confirmé — votre abonnement est en cours de mise à jour.',
    },

    cancelled: {
      kind: 'cancelled' as const,
      message:
        'Le paiement a été annulé. Aucun changement n’a été effectué.',
    },
  };

  /**
   * Message affiché après le retour du paiement.
   *
   * On vérifie explicitement la valeur du paramètre
   * au lieu de forcer son type avec "as".
   */
  protected readonly checkoutNotice = signal<CheckoutNotice | null>(
    this.getCheckoutNotice(),
  );

  private getCheckoutNotice(): CheckoutNotice | null {
    const checkout = this.route.snapshot.queryParamMap.get('checkout');

    if (checkout === 'success') {
      return Subscription.CHECKOUT_NOTICES.success;
    }

    if (checkout === 'cancelled') {
      return Subscription.CHECKOUT_NOTICES.cancelled;
    }

    return null;
  }

  protected isCurrentPlan(tier: PlanTier): boolean {
    const clinic = this.clinicResource.value();

    return (
      !!clinic &&
      clinic.plan_tier === tier &&
      clinic.subscription_status !== 'cancelled'
    );
  }

  protected async selectPlan(tier: PlanTier): Promise<void> {
    this.errorMessage.set(null);
    this.working.set(tier);

    try {
      const result = await firstValueFrom(
        this.subscriptionService.startCheckout(
          tier,
          this.billingCycle(),
        ),
      );

      window.location.href = result.checkout_url;
    } catch (error) {
      const apiError = parseApiError(
        error,
        "Impossible de démarrer le paiement pour l'instant.",
      );

      this.errorMessage.set(apiError.message);
      this.working.set(null);
    }
  }

  protected async manageBilling(): Promise<void> {
    this.errorMessage.set(null);
    this.working.set('portal');

    try {
      const result = await firstValueFrom(
        this.subscriptionService.openBillingPortal(),
      );

      window.location.href = result.portal_url;
    } catch (error) {
      const apiError = parseApiError(
        error,
        "Impossible d'ouvrir la gestion de l'abonnement.",
      );

      this.errorMessage.set(apiError.message);
      this.working.set(null);
    }
  }

  protected dismissNotice(): void {
    this.checkoutNotice.set(null);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
    });
  }
}