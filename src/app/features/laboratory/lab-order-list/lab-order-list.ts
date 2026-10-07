import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { AuthService } from '../../../core/auth/auth.service';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { injectIsHandset } from '../../../core/utils/handset';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { RecordCard } from '../../../shared/components/record-card/record-card';
import { RecordCardData } from '../../../shared/components/record-card/record-card.model';
import { LabOrderForm } from '../lab-order-form/lab-order-form';
import {
  LAB_ORDER_STATUSES,
  LAB_ORDER_STATUS_LABELS,
  LAB_ORDER_STATUS_TONES,
  LabOrder,
  LabOrderStatus,
} from '../laboratory.model';
import { LaboratoryService } from '../laboratory.service';
import { apiResource } from '../../../core/api/api-resource';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// File de travail du laboratoire : le technicien voit toutes les demandes de la clinique, le
// médecin les siennes, l'administrateur toutes (périmètre appliqué par l'API). Filtres dans l'URL.
@Component({
  selector: 'app-lab-order-list',
  imports: [
    DatePipe,
    EmptyState,
    RecordCard,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    TranslocoPipe,
  ],
  templateUrl: './lab-order-list.html',
  styleUrl: '../../../shared/styles/list-page.css',
})
export class LabOrderList {
  protected readonly isHandset = injectIsHandset();
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly laboratoryService = inject(LaboratoryService);

  readonly status = input<LabOrderStatus | undefined>();
  readonly search = input<string | undefined>();
  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly statuses = LAB_ORDER_STATUSES;
  protected readonly statusLabels = LAB_ORDER_STATUS_LABELS;
  protected readonly displayedColumns = ['number', 'patient', 'doctor', 'tests', 'status', 'created_at'];
  // Seul le médecin crée une demande (permissions-matrix.md § DEMANDE DE LABORATOIRE).
  protected readonly canCreate = computed(() => this.auth.hasRole('doctor') && this.auth.user()?.doctor_id != null);

  protected readonly searchInput = signal('');
  private searchDebounceHandle?: ReturnType<typeof setTimeout>;

  protected readonly ordersResource = apiResource<Paginated<LabOrder>>(
    () => ({
      url: this.laboratoryService.ordersUrl,
      params: {
        page: this.page(),
        ...(this.status() ? { status: this.status()! } : {}),
        ...(this.search() ? { search: this.search()! } : {}),
      },
    }),
    { defaultValue: emptyPage<LabOrder>() },
  );

  protected readonly orders = computed(() => this.ordersResource.value().results);
  protected readonly totalCount = computed(() => this.ordersResource.value().count);

  constructor() {
    effect(() => this.searchInput.set(this.search() ?? ''));
  }

  protected statusLabel(order: LabOrder): string {
    return LAB_ORDER_STATUS_LABELS[order.status];
  }

  protected statusTone(order: LabOrder): string {
    return LAB_ORDER_STATUS_TONES[order.status];
  }

  protected testNames(order: LabOrder): string {
    return order.items.map((item) => item.test_name).join(', ');
  }

  protected cardFor(order: LabOrder): RecordCardData {
    return {
      title: order.patient_display,
      subtitle: order.number,
      icon: 'biotech',
      status: { label: LAB_ORDER_STATUS_LABELS[order.status], tone: LAB_ORDER_STATUS_TONES[order.status] },
      fields: [
        { label: translate('laboratory.tests'), value: this.testNames(order) },
        { label: translate('common.columns.doctor'), value: order.doctor_display },
        { label: translate('laboratory.requestedAt'), value: order.created_at, date: 'short' },
        ...(order.has_abnormal ? [{ label: translate('laboratory.abnormal'), value: translate('common.actions.yes') }] : []),
      ],
    };
  }

  protected open(order: LabOrder): void {
    this.router.navigate(['/laboratory/orders', order.id]);
  }

  protected openCreate(): void {
    const ref = this.dialog.open(LabOrderForm, { width: '720px', maxWidth: '95vw', autoFocus: 'first-tabbable' });
    ref.afterClosed().subscribe((created: LabOrder | undefined) => created && this.open(created));
  }

  protected onStatusChange(status: LabOrderStatus | ''): void {
    this.navigate({ status: status || null });
  }

  protected onSearchInput(value: string): void {
    this.searchInput.set(value);
    clearTimeout(this.searchDebounceHandle);
    this.searchDebounceHandle = setTimeout(() => this.navigate({ search: value || null }), SEARCH_DEBOUNCE_MS);
  }

  protected onPageChange(event: PageEvent): void {
    this.router.navigate([], { queryParams: { page: event.pageIndex + 1 }, queryParamsHandling: 'merge' });
  }

  private navigate(queryParams: Record<string, string | null>): void {
    this.router.navigate([], { queryParams: { ...queryParams, page: null }, queryParamsHandling: 'merge' });
  }
}
