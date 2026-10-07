import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { openBlobInNewTab, triggerBlobDownload } from '../../../core/utils/file-download';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../payment.model';
import { PaymentService } from '../payment.service';
import { MoneyPipe } from '../../../core/utils/money';
import { RecordCard } from '../../../shared/components/record-card/record-card';
import { RecordCardData, statusTone } from '../../../shared/components/record-card/record-card.model';
import { injectIsHandset } from '../../../core/utils/handset';
import { apiResource } from '../../../core/api/api-resource';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-payment-list',
  imports: [
    NgTemplateOutlet,
    RecordCard,
    MoneyPipe,
    DatePipe,
    EmptyState,
    RouterLink,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    TranslocoPipe,
  ],
  templateUrl: './payment-list.html',
  styleUrl: './payment-list.css',
})
export class PaymentList {
  protected readonly isHandset = injectIsHandset();

  protected cardFor(payment: Payment): RecordCardData {
    return {
      title: payment.patient_display,
      subtitle: payment.invoice_number,
      icon: 'payments',
      status: { label: this.statusLabel(payment), tone: statusTone(payment.status) },
      fields: [
        { label: translate('payments.amount'), value: payment.amount, currency: payment.currency },
        { label: translate('payments.method'), value: this.methodLabel(payment) },
        { label: translate('common.columns.date'), value: payment.date, date: 'mediumDate' },
      ],
    };
  }

  private readonly router = inject(Router);
  private readonly paymentService = inject(PaymentService);
  protected readonly auth = inject(AuthService);

  readonly search = input<string | undefined>();
  readonly status = input<PaymentStatus | undefined>();
  readonly method = input<PaymentMethod | undefined>();
  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly statusOptions = Object.entries(PAYMENT_STATUS_LABELS) as [PaymentStatus, string][];
  protected readonly methodOptions = Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][];
  protected readonly displayedColumns = ['date', 'invoice', 'patient', 'amount', 'method', 'status', 'actions'];

  protected readonly searchInput = signal('');
  private searchDebounceHandle?: ReturnType<typeof setTimeout>;

  protected readonly paymentsResource = apiResource<Paginated<Payment>>(
    () => ({
      url: `${environment.apiBaseUrl}/payments/`,
      params: {
        page: this.page(),
        ...(this.search() ? { search: this.search()! } : {}),
        ...(this.status() ? { status: this.status()! } : {}),
        ...(this.method() ? { method: this.method()! } : {}),
      },
    }),
    { defaultValue: emptyPage<Payment>() },
  );

  protected readonly dataSource = new MatTableDataSource<Payment>([]);
  protected readonly totalCount = computed(() => this.paymentsResource.value().count);

  protected readonly canRefund = computed(() => this.auth.hasRole('clinic_admin'));

  constructor() {
    effect(() => {
      this.dataSource.data = this.paymentsResource.value().results;
    });
    effect(() => {
      this.searchInput.set(this.search() ?? '');
    });
  }

  protected onSearchInput(value: string): void {
    this.searchInput.set(value);
    clearTimeout(this.searchDebounceHandle);
    this.searchDebounceHandle = setTimeout(() => {
      this.router.navigate([], {
        queryParams: { search: value || null, page: null },
        queryParamsHandling: 'merge',
      });
    }, SEARCH_DEBOUNCE_MS);
  }

  protected statusLabel(payment: Payment): string {
    return PAYMENT_STATUS_LABELS[payment.status];
  }

  protected methodLabel(payment: Payment): string {
    return PAYMENT_METHOD_LABELS[payment.method];
  }

  protected onStatusFilterChange(status: PaymentStatus | ''): void {
    this.router.navigate([], { queryParams: { status: status || null, page: null }, queryParamsHandling: 'merge' });
  }

  protected onMethodFilterChange(method: PaymentMethod | ''): void {
    this.router.navigate([], { queryParams: { method: method || null, page: null }, queryParamsHandling: 'merge' });
  }

  protected onPageChange(event: PageEvent): void {
    this.router.navigate([], { queryParams: { page: event.pageIndex + 1 }, queryParamsHandling: 'merge' });
  }

  protected refund(payment: Payment): void {
    const confirmed = confirm(translate('payments.confirmRefundInvoice', { amount: payment.amount, invoice: payment.invoice_number }));
    if (!confirmed) {
      return;
    }
    this.paymentService.refund(payment.id).subscribe(() => this.paymentsResource.reload());
  }

  protected downloadReceipt(payment: Payment): void {
    this.paymentService.downloadReceiptPdf(payment.id).subscribe((blob) => openBlobInNewTab(blob));
  }

  protected exportCsv(): void {
    this.paymentService.exportCsv().subscribe((blob) => triggerBlobDownload(blob, translate('exports.payments')));
  }
}
