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
import { reserveExternalPage } from '../../core/utils/external-page';
import { BillingCycle, Clinic, PlanTier, SUBSCRIPTION_STATUS_LABELS } from '../../core/models/clinic.model';
import { SuccessNotifier } from '../../shared/notifications/success-notifier';
import { CURRENCY_LABEL, PLAN_CATALOG, TRIAL_DAYS, priceForCycle } from './plan-catalog';
import { SubscriptionOverview, SubscriptionPayment, SubscriptionService } from './subscription.service';

type CheckoutNotice = { kind: 'success' | 'cancelled' | 'checking' | 'failed'; message: string };

// Suivi du paiement pendant que la page SasPay est ouverte dans un autre onglet (le prestataire Wave,
// PayDunya, ne renvoie pas vers proCli après paiement) : toutes les 4 s pendant 10 min au plus, et
// aussitôt quand l'utilisateur revient sur proCli. Au-delà, le webhook ou la tâche quotidienne
// prennent le relais.
const PAYMENT_POLL_MS = 4000;
const PAYMENT_POLL_ATTEMPTS = 150;

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
  // Paiement en cours de suivi et nombre de vérifications déjà faites.
  private pendingPayment: { id: number; attempt: number } | null = null;

  constructor() {
    const paymentId = Number(this.route.snapshot.queryParamMap.get('payment'));
    if (paymentId) {
      this.trackPayment(paymentId);
    }
    // Retour sur proCli (onglet ou application) après avoir payé : vérification immédiate.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && this.pendingPayment) {
        clearTimeout(this.pollHandle);
        void this.pollPayment();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.pollHandle);
      document.removeEventListener('visibilitychange', onVisible);
    });
  }

  private trackPayment(paymentId: number): void {
    clearTimeout(this.pollHandle);
    this.pendingPayment = { id: paymentId, attempt: 0 };
    void this.pollPayment();
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

  private async pollPayment(): Promise<void> {
    const pending = this.pendingPayment;
    if (!pending) {
      return;
    }
    pending.attempt += 1;
    try {
      const payment = await firstValueFrom(this.subscriptionService.refreshPayment(pending.id));
      if (this.pendingPayment !== pending) {
        return; // un autre paiement a été lancé entre-temps
      }
      if (payment.status === 'paid') {
        this.pendingPayment = null;
        this.checkoutNotice.set({ kind: 'success', message: 'subscription.payment.paid' });
        this.clinicResource.reload();
        this.overviewResource.reload();
        this.auth.refreshUser(); // modules de la formule dans le menu
        return;
      }
      if (payment.status === 'expired') {
        this.pendingPayment = null;
        this.checkoutNotice.set({ kind: 'failed', message: 'subscription.payment.failed' });
        return;
      }
      // « Échoué » n'arrête pas le suivi : la page de paiement propose « Réessayer » sur la même session.
      if (payment.status === 'failed') {
        this.checkoutNotice.set({ kind: 'failed', message: 'subscription.payment.failedRetry' });
      }
    } catch {
      // erreur réseau passagère : nouvelle tentative ci-dessous
    }
    if (pending.attempt >= PAYMENT_POLL_ATTEMPTS) {
      this.pendingPayment = null;
      this.checkoutNotice.set({ kind: 'checking', message: 'subscription.payment.stillPending' });
      return;
    }
    this.pollHandle = setTimeout(() => void this.pollPayment(), PAYMENT_POLL_MS);
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
    // Paiement prépayé : page de paiement à côté de proCli (réservée pendant le clic), cet écran suit
    // le paiement et se met à jour seul. Stripe : redirection classique, avec retour vers proCli.
    const page = this.isPrepaid() ? reserveExternalPage() : null;
    this.working.set(tier);
    try {
      const result = await firstValueFrom(this.subscriptionService.startCheckout(tier, this.billingCycle()));
      if (!page || !result.payment_id) {
        window.location.href = result.checkout_url;
        return;
      }
      page.open(result.checkout_url);
      this.working.set(null);
      this.checkoutNotice.set({ kind: 'checking', message: 'subscription.payment.opened' });
      this.router.navigate([], { relativeTo: this.route, queryParams: { payment: result.payment_id } });
      this.trackPayment(result.payment_id);
    } catch (error) {
      page?.cancel();
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
    this.pendingPayment = null;
    this.checkoutNotice.set(null);
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
}
