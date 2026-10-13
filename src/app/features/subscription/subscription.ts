import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
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
import { apiResource } from '../../core/api/api-resource';
import { parseApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { BillingCycle, Clinic, PlanTier, SUBSCRIPTION_STATUS_LABELS } from '../../core/models/clinic.model';
import { SuccessNotifier } from '../../shared/notifications/success-notifier';
import { CURRENCY_LABEL, PLAN_CATALOG, TRIAL_DAYS, priceForCycle } from './plan-catalog';
import { SubscriptionOverview, SubscriptionPayment, SubscriptionService } from './subscription.service';

type CheckoutNotice = { kind: 'success' | 'cancelled' | 'checking' | 'failed'; message: string };

// Vérification du paiement au retour de la page SasPay : toutes les 3 s pendant 1 min au plus ; le
// webhook ou la tâche quotidienne prennent le relais si la confirmation de l'opérateur tarde.
const PAYMENT_POLL_MS = 3000;
const PAYMENT_POLL_ATTEMPTS = 20;

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

  private readonly clinicId = computed(() => this.auth.user()?.clinic ?? null);

  protected readonly clinicResource = apiResource<Clinic | null>(
    () => {
      const id = this.clinicId();
      return id ? { url: `${environment.apiBaseUrl}/clinics/${id}/` } : undefined;
    },
    { defaultValue: null },
  );

  protected readonly overviewResource = apiResource<SubscriptionOverview | null>(
    () => ({ url: `${environment.apiBaseUrl}/subscriptions/overview/` }),
    { defaultValue: null },
  );

  // Paiement prépayé (SasPay : Wave, Orange Money, carte) ; sinon abonnement Stripe à prélèvement automatique.
  protected readonly isPrepaid = computed(() => this.overviewResource.value()?.provider !== 'stripe');
  protected readonly payments = computed<SubscriptionPayment[]>(() => this.overviewResource.value()?.payments ?? []);
  protected readonly graceDays = computed(() => this.overviewResource.value()?.grace_days ?? 3);

  protected readonly checkoutNotice = signal<CheckoutNotice | null>(this.initialNotice());
  private pollHandle?: ReturnType<typeof setTimeout>;

  constructor() {
    const paymentId = Number(this.route.snapshot.queryParamMap.get('payment'));
    if (paymentId) {
      this.pollPayment(paymentId, 1);
    }
    inject(DestroyRef).onDestroy(() => clearTimeout(this.pollHandle));
  }

  private initialNotice(): CheckoutNotice | null {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('payment')) {
      return { kind: 'checking', message: 'subscription.payment.checking' };
    }
    const checkout = params.get('checkout');
    if (checkout === 'success') {
      return { kind: 'success', message: 'subscription.checkoutSuccess' };
    }
    if (checkout === 'cancelled') {
      return { kind: 'cancelled', message: 'subscription.checkoutCancelled' };
    }
    return null;
  }

  private async pollPayment(paymentId: number, attempt: number): Promise<void> {
    try {
      const payment = await firstValueFrom(this.subscriptionService.refreshPayment(paymentId));
      if (payment.status === 'paid') {
        this.checkoutNotice.set({ kind: 'success', message: 'subscription.payment.paid' });
        this.clinicResource.reload();
        this.overviewResource.reload();
        this.auth.refreshUser(); // modules de la formule dans le menu
        return;
      }
      if (payment.status === 'failed' || payment.status === 'expired') {
        this.checkoutNotice.set({ kind: 'failed', message: 'subscription.payment.failed' });
        return;
      }
    } catch {
      // erreur réseau passagère : nouvelle tentative ci-dessous
    }
    if (attempt >= PAYMENT_POLL_ATTEMPTS) {
      this.checkoutNotice.set({ kind: 'checking', message: 'subscription.payment.stillPending' });
      return;
    }
    this.pollHandle = setTimeout(() => this.pollPayment(paymentId, attempt + 1), PAYMENT_POLL_MS);
  }

  // Abonnement en cours (actif ou en délai de grâce).
  protected hasSubscription(): boolean {
    const status = this.clinicResource.value()?.subscription_status;
    return status === 'active' || status === 'past_due';
  }

  protected isCurrentPlan(tier: PlanTier): boolean {
    const clinic = this.clinicResource.value();
    return this.hasSubscription() && clinic!.plan_tier === tier && clinic!.billing_cycle === this.billingCycle();
  }

  protected planButtonLabel(tier: PlanTier): string {
    if (this.isPrepaid()) {
      return this.isCurrentPlan(tier) ? 'subscription.extend' : 'subscription.pay';
    }
    return this.hasSubscription() ? 'subscription.switchToPlan' : 'subscription.choosePlan';
  }

  protected async selectPlan(tier: PlanTier): Promise<void> {
    this.errorMessage.set(null);
    if (!this.isPrepaid() && this.hasSubscription()) {
      await this.changeStripePlan(tier);
      return;
    }
    // Option B (décision du 2026-10-14) : une autre formule démarre une nouvelle période le jour du
    // paiement ; les jours restants de la formule actuelle sont perdus — annoncé avant de payer.
    if (this.isPrepaid() && this.hasSubscription() && !this.isCurrentPlan(tier)) {
      const plan = this.plans.find((candidate) => candidate.tier === tier);
      if (!confirm(translate('subscription.confirmPrepaidChange', { plan: plan?.label ?? tier }))) {
        return;
      }
    }
    this.working.set(tier);
    try {
      const result = await firstValueFrom(this.subscriptionService.startCheckout(tier, this.billingCycle()));
      window.location.href = result.checkout_url;
    } catch (error) {
      this.errorMessage.set(parseApiError(error, translate('subscription.checkoutError')).message);
      this.working.set(null);
    }
  }

  private async changeStripePlan(tier: PlanTier): Promise<void> {
    const plan = this.plans.find((candidate) => candidate.tier === tier);
    const cycleLabel = translate(this.billingCycle() === 'annual' ? 'subscription.cycleAnnual' : 'subscription.cycleMonthly');
    if (!confirm(translate('subscription.confirmChange', { plan: plan?.label ?? tier, cycle: cycleLabel }))) {
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
      const result = await firstValueFrom(this.subscriptionService.openBillingPortal());
      window.location.href = result.portal_url;
    } catch (error) {
      this.errorMessage.set(parseApiError(error, translate('subscription.portalError')).message);
      this.working.set(null);
    }
  }

  protected planLabel(tier: string): string {
    return this.plans.find((plan) => plan.tier === tier)?.label ?? tier;
  }

  protected dismissNotice(): void {
    clearTimeout(this.pollHandle);
    this.checkoutNotice.set(null);
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
}
