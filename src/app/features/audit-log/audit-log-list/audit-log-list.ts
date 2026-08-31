import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule, MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { environment } from '../../../../environments/environment';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { toIsoDate } from '../../../core/utils/date';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { AUDIT_ACTION_LABELS, AuditAction, AuditLogEntry } from '../audit-log.model';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-audit-log-list',
  imports: [
    DatePipe,
    EmptyState,
    MatChipsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './audit-log-list.html',
  styleUrl: './audit-log-list.css',
})
export class AuditLogList {
  private readonly router = inject(Router);

  readonly action = input<AuditAction | undefined>();
  readonly search = input<string | undefined>();
  readonly dateFrom = input<string | undefined>();
  readonly dateTo = input<string | undefined>();
  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly actionOptions = Object.entries(AUDIT_ACTION_LABELS) as [AuditAction, string][];
  protected readonly displayedColumns = ['created_at', 'user_display', 'action', 'model_name', 'object_id'];

  protected readonly searchInput = signal('');
  private searchDebounceHandle?: ReturnType<typeof setTimeout>;

  protected readonly logsResource = httpResource<Paginated<AuditLogEntry>>(
    () => ({
      url: `${environment.apiBaseUrl}/audit-log/`,
      params: {
        page: this.page(),
        ...(this.action() ? { action: this.action()! } : {}),
        ...(this.search() ? { search: this.search()! } : {}),
        ...(this.dateFrom() ? { created_at__gte: this.dateFrom()! } : {}),
        ...(this.dateTo() ? { created_at__lte: this.dateTo()! } : {}),
      },
    }),
    { defaultValue: emptyPage<AuditLogEntry>() },
  );

  protected readonly dataSource = new MatTableDataSource<AuditLogEntry>([]);
  protected readonly totalCount = computed(() => this.logsResource.value().count);

  constructor() {
    effect(() => {
      this.dataSource.data = this.logsResource.value().results;
    });
    effect(() => {
      this.searchInput.set(this.search() ?? '');
    });
  }

  protected actionLabel(entry: AuditLogEntry): string {
    return AUDIT_ACTION_LABELS[entry.action];
  }

  protected onActionFilterChange(action: AuditAction | ''): void {
    this.router.navigate([], { queryParams: { action: action || null, page: null }, queryParamsHandling: 'merge' });
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

  protected onDateFromChange(event: MatDatepickerInputEvent<Date>): void {
    this.router.navigate([], {
      queryParams: { dateFrom: event.value ? toIsoDate(event.value) : null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected onDateToChange(event: MatDatepickerInputEvent<Date>): void {
    this.router.navigate([], {
      queryParams: { dateTo: event.value ? toIsoDate(event.value) : null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected onPageChange(event: PageEvent): void {
    this.router.navigate([], { queryParams: { page: event.pageIndex + 1 }, queryParamsHandling: 'merge' });
  }
}
