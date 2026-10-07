// import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
// 
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

//   protected readonly clinicResource = apiResource<Clinic | null>(
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
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

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
import { CURRENCY_LABEL, PLAN_CATALOG, TRIAL_DAYS, priceForCycle } from './plan-catalog';
import { SubscriptionService } from './subscription.service';
import { apiResource } from '../../core/api/api-resource';

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
    TranslocoPipe,
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
  protected readonly priceForCycle = priceForCycle;
  protected readonly currencyLabel = CURRENCY_LABEL;
  protected readonly trialDays = TRIAL_DAYS;

  protected readonly billingCycle = signal<BillingCycle>('monthly');

  protected readonly working = signal<PlanTier | 'portal' | null>(null);

  protected readonly errorMessage = signal<string | null>(null);

  private readonly clinicId = computed(
    () => this.auth.user()?.clinic ?? null,
  );

  protected readonly clinicResource = apiResource<Clinic | null>(
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
      message: 'subscription.checkoutSuccess', // clé de traduction, traduite à l'affichage
    },

    cancelled: {
      kind: 'cancelled' as const,
      message: 'subscription.checkoutCancelled',
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

    // Une clinique en essai (ou suspendue à la fin de son essai) a plan_tier = 'starter' par défaut
    // sans avoir souscrit : seule une souscription en cours (active / paiement en retard) compte
    // comme formule actuelle, sinon le bouton de souscription Starter serait désactivé.
    return (
      this.hasSubscription() &&
      clinic!.plan_tier === tier &&
      clinic!.billing_cycle === this.billingCycle()
    );
  }

  // Souscription en cours : un choix de formule modifie l'abonnement existant au lieu d'ouvrir une
  // nouvelle page de paiement (qui créerait un second abonnement).
  protected hasSubscription(): boolean {
    const status = this.clinicResource.value()?.subscription_status;
    return status === 'active' || status === 'past_due';
  }

  protected async selectPlan(tier: PlanTier): Promise<void> {
    this.errorMessage.set(null);

    if (this.hasSubscription()) {
      await this.changePlan(tier);
      return;
    }

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
        translate('subscription.checkoutError'),
      );

      this.errorMessage.set(apiError.message);
      this.working.set(null);
    }
  }

  private async changePlan(tier: PlanTier): Promise<void> {
    const plan = this.plans.find((candidate) => candidate.tier === tier);
    const cycleLabel = translate(this.billingCycle() === 'annual' ? 'subscription.cycleAnnual' : 'subscription.cycleMonthly');
    const confirmed = confirm(translate('subscription.confirmChange', { plan: plan?.label ?? tier, cycle: cycleLabel }));
    if (!confirmed) {
      return;
    }
    this.working.set(tier);
    try {
      await firstValueFrom(this.subscriptionService.changePlan(tier, this.billingCycle()));
      this.successNotifier.show(translate('subscription.planChanged'));
      this.clinicResource.reload();
    } catch (error) {
      this.errorMessage.set(parseApiError(error, translate('subscription.changeError')).message);
    } finally {
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
        translate('subscription.portalError'),
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