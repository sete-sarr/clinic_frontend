import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { environment } from '../../../../environments/environment';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { INVOICE_STATUS_LABELS, Invoice } from '../../billing/invoice.model';
import { InvoiceService } from '../../billing/invoice.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-portal-invoices',
  imports: [
    DatePipe,
    EmptyState,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './portal-invoices.html',
  styleUrl: './portal-invoices.css',
})
export class PortalInvoices {
  private readonly router = inject(Router);
  private readonly invoiceService = inject(InvoiceService);

  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly statusLabels = INVOICE_STATUS_LABELS;

  // Same endpoint the staff invoice-list uses — CanManageInvoices already scopes SAFE methods to
  // the patient's own invoices.
  protected readonly invoicesResource = httpResource<Paginated<Invoice>>(
    () => ({ url: `${environment.apiBaseUrl}/billing/`, params: { page: this.page() } }),
    { defaultValue: emptyPage<Invoice>() },
  );

  protected readonly totalCount = computed(() => this.invoicesResource.value().count);

  protected statusLabel(invoice: Invoice): string {
    return INVOICE_STATUS_LABELS[invoice.status];
  }

  protected onPageChange(event: PageEvent): void {
    this.router.navigate([], { queryParams: { page: event.pageIndex + 1 }, queryParamsHandling: 'merge' });
  }

  protected downloadPdf(invoice: Invoice): void {
    this.invoiceService.downloadPdf(invoice.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }
}
