import { DatePipe } from '@angular/common';
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
import { MatTableModule } from '@angular/material/table';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { injectIsHandset } from '../../../core/utils/handset';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { RecordCard } from '../../../shared/components/record-card/record-card';
import { RecordCardData } from '../../../shared/components/record-card/record-card.model';
import {
  ADMISSION_STATUSES,
  ADMISSION_STATUS_LABELS,
  ADMISSION_STATUS_TONES,
  Admission,
  AdmissionStatus,
} from '../hospitalization.model';
import { HospitalizationService } from '../hospitalization.service';
import { apiResource } from '../../../core/api/api-resource';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// Séjours de la clinique ; chaque rôle n'en reçoit que les champs permis (réception : emplacement,
// comptabilité : dates et nuitées). Filtres dans l'URL (withComponentInputBinding).
@Component({
  selector: 'app-stay-list',
  imports: [
    DatePipe,
    EmptyState,
    RecordCard,
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
    TranslocoPipe,
  ],
  templateUrl: './stay-list.html',
  styleUrl: '../../../shared/styles/list-page.css',
})
export class StayList {
  protected readonly isHandset = injectIsHandset();
  private readonly router = inject(Router);
  private readonly hospitalizationService = inject(HospitalizationService);

  readonly status = input<AdmissionStatus | undefined>();
  readonly search = input<string | undefined>();
  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly statuses = ADMISSION_STATUSES;
  protected readonly statusLabels = ADMISSION_STATUS_LABELS;
  protected readonly displayedColumns = ['number', 'patient', 'location', 'status', 'admitted_at', 'discharged_at'];

  protected readonly searchInput = signal('');
  private searchDebounceHandle?: ReturnType<typeof setTimeout>;

  protected readonly staysResource = apiResource<Paginated<Admission>>(
    () => ({
      url: this.hospitalizationService.admissionsUrl,
      params: {
        page: this.page(),
        ...(this.status() ? { status: this.status()! } : {}),
        ...(this.search() ? { search: this.search()! } : {}),
      },
    }),
    { defaultValue: emptyPage<Admission>() },
  );

  protected readonly stays = computed(() => this.staysResource.value().results);
  protected readonly totalCount = computed(() => this.staysResource.value().count);

  constructor() {
    effect(() => this.searchInput.set(this.search() ?? ''));
  }

  protected location(stay: Admission): string {
    return stay.room_number ? `${stay.department_name} · ${stay.room_number} — ${stay.bed_label}` : stay.department_name;
  }

  protected statusLabel(stay: Admission): string {
    return ADMISSION_STATUS_LABELS[stay.status];
  }

  protected statusTone(stay: Admission): string {
    return ADMISSION_STATUS_TONES[stay.status];
  }

  protected cardFor(stay: Admission): RecordCardData {
    return {
      title: stay.patient_display,
      subtitle: stay.number,
      icon: 'bed',
      status: { label: ADMISSION_STATUS_LABELS[stay.status], tone: ADMISSION_STATUS_TONES[stay.status] },
      fields: [
        { label: translate('hospitalization.location'), value: this.location(stay) },
        { label: translate('hospitalization.admittedAt'), value: stay.admitted_at, date: 'short' },
        ...(stay.discharged_at ? [{ label: translate('hospitalization.dischargedAt'), value: stay.discharged_at, date: 'short' }] : []),
      ],
    };
  }

  protected open(stay: Admission): void {
    this.router.navigate(['/hospitalization/stays', stay.id]);
  }

  protected onStatusChange(status: AdmissionStatus | ''): void {
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
