import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { CONSULTATION_STATUS_LABELS, Consultation, ConsultationStatus } from '../consultation.model';
import { ConsultationForm } from '../consultation-form/consultation-form';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-consultation-list',
  imports: [
    DatePipe,
    EmptyState,
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
  ],
  templateUrl: './consultation-list.html',
  styleUrl: './consultation-list.css',
})
export class ConsultationList {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  protected readonly auth = inject(AuthService);

  readonly search = input<string | undefined>();
  readonly status = input<ConsultationStatus | undefined>();
  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly statusOptions = Object.entries(CONSULTATION_STATUS_LABELS) as [
    ConsultationStatus,
    string,
  ][];
  protected readonly displayedColumns = ['date', 'patient', 'doctor', 'status', 'actions'];

  protected readonly searchInput = signal('');
  private searchDebounceHandle?: ReturnType<typeof setTimeout>;

  protected readonly consultationsResource = httpResource<Paginated<Consultation>>(
    () => ({
      url: `${environment.apiBaseUrl}/consultations/`,
      params: {
        page: this.page(),
        ...(this.search() ? { search: this.search()! } : {}),
        ...(this.status() ? { status: this.status()! } : {}),
      },
    }),
    { defaultValue: emptyPage<Consultation>() },
  );

  protected readonly dataSource = new MatTableDataSource<Consultation>([]);
  protected readonly totalCount = computed(() => this.consultationsResource.value().count);

  protected readonly canManage = computed(() => this.auth.hasRole('doctor', 'clinic_admin'));

  constructor() {
    effect(() => {
      this.dataSource.data = this.consultationsResource.value().results;
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

  protected statusLabel(consultation: Consultation): string {
    return CONSULTATION_STATUS_LABELS[consultation.status];
  }

  protected onStatusFilterChange(status: ConsultationStatus | ''): void {
    this.router.navigate([], { queryParams: { status: status || null, page: null }, queryParamsHandling: 'merge' });
  }

  protected onPageChange(event: PageEvent): void {
    this.router.navigate([], { queryParams: { page: event.pageIndex + 1 }, queryParamsHandling: 'merge' });
  }

  protected openCreate(): void {
    if (!this.canManage()) {
      return;
    }
    const ref = this.dialog.open(ConsultationForm, { width: '820px', maxWidth: '95vw', autoFocus: 'first-tabbable' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.consultationsResource.reload();
      }
    });
  }

  protected openEdit(consultation: Consultation): void {
    if (!this.canManage()) {
      return;
    }
    const ref = this.dialog.open(ConsultationForm, {
      width: '820px',
      maxWidth: '95vw',
      data: { id: String(consultation.id) },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.consultationsResource.reload();
      }
    });
  }
}
