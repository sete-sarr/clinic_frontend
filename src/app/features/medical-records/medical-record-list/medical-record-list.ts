import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { environment } from '../../../../environments/environment';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { MedicalRecord } from '../medical-record.model';
import { MedicalRecordForm } from '../medical-record-form/medical-record-form';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-medical-record-list',
  imports: [
    EmptyState,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './medical-record-list.html',
  styleUrl: './medical-record-list.css',
})
export class MedicalRecordList {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });
  readonly patient = input<string | undefined>();
  readonly search = input<string | undefined>();

  protected readonly pageSize = PAGE_SIZE;
  protected readonly displayedColumns = ['patient', 'allergies', 'actions'];

  protected readonly searchInput = signal('');
  private searchDebounceHandle?: ReturnType<typeof setTimeout>;

  protected readonly recordsResource = httpResource<Paginated<MedicalRecord>>(
    () => ({
      url: `${environment.apiBaseUrl}/medical-records/`,
      params: {
        page: this.page(),
        ...(this.patient() ? { patient: this.patient()! } : {}),
        ...(this.search() ? { search: this.search()! } : {}),
      },
    }),
    { defaultValue: emptyPage<MedicalRecord>() },
  );

  protected readonly dataSource = new MatTableDataSource<MedicalRecord>([]);
  protected readonly totalCount = computed(() => this.recordsResource.value().count);

  constructor() {
    effect(() => {
      this.dataSource.data = this.recordsResource.value().results;
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

  protected onPageChange(event: PageEvent): void {
    this.router.navigate([], { queryParams: { page: event.pageIndex + 1 }, queryParamsHandling: 'merge' });
  }

  protected openEdit(record: MedicalRecord): void {
    const ref = this.dialog.open(MedicalRecordForm, {
      width: '720px',
      maxWidth: '95vw',
      data: { id: String(record.id) },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.recordsResource.reload();
      }
    });
  }
}
