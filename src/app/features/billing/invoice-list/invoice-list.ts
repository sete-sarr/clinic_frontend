import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, numberAttribute } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { openBlobInNewTab, triggerBlobDownload } from '../../../core/utils/file-download';
import { INVOICE_STATUS_LABELS, Invoice, InvoiceStatus } from '../invoice.model';
import { InvoiceForm } from '../invoice-form/invoice-form';
import { InvoiceService } from '../invoice.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-invoice-list',
  imports: [
    DatePipe,
    EmptyState,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './invoice-list.html',
  styleUrl: './invoice-list.css',
})
export class InvoiceList {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly invoiceService = inject(InvoiceService);
  protected readonly auth = inject(AuthService);

  readonly status = input<InvoiceStatus | undefined>();
  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly statusOptions = Object.entries(INVOICE_STATUS_LABELS) as [InvoiceStatus, string][];
  protected readonly displayedColumns = ['number', 'patient', 'total', 'status', 'actions'];

  protected readonly invoicesResource = httpResource<Paginated<Invoice>>(
    () => ({
      url: `${environment.apiBaseUrl}/billing/`,
      params: {
        page: this.page(),
        ...(this.status() ? { status: this.status()! } : {}),
      },
    }),
    { defaultValue: emptyPage<Invoice>() },
  );

  protected readonly dataSource = new MatTableDataSource<Invoice>([]);
  protected readonly totalCount = computed(() => this.invoicesResource.value().count);

  protected readonly canCreate = computed(() => this.auth.hasRole('secretary', 'accountant', 'clinic_admin'));

  constructor() {
    effect(() => {
      this.dataSource.data = this.invoicesResource.value().results;
    });
  }

  protected statusLabel(invoice: Invoice): string {
    return INVOICE_STATUS_LABELS[invoice.status];
  }

  protected onStatusFilterChange(status: InvoiceStatus | ''): void {
    this.router.navigate([], { queryParams: { status: status || null, page: null }, queryParamsHandling: 'merge' });
  }

  protected onPageChange(event: PageEvent): void {
    this.router.navigate([], { queryParams: { page: event.pageIndex + 1 }, queryParamsHandling: 'merge' });
  }

  protected openCreate(): void {
    if (!this.canCreate()) {
      return;
    }
    const ref = this.dialog.open(InvoiceForm, { width: '900px', maxWidth: '95vw', autoFocus: 'first-tabbable' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.invoicesResource.reload();
      }
    });
  }

  protected openEdit(invoice: Invoice): void {
    const ref = this.dialog.open(InvoiceForm, {
      width: '900px',
      maxWidth: '95vw',
      data: { id: String(invoice.id) },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.invoicesResource.reload();
      }
    });
  }

  protected downloadPdf(invoice: Invoice): void {
    this.invoiceService.downloadPdf(invoice.id).subscribe((blob) => openBlobInNewTab(blob));
  }

  protected exportCsv(): void {
    this.invoiceService.exportCsv().subscribe((blob) => triggerBlobDownload(blob, 'factures-export.csv'));
  }
}
