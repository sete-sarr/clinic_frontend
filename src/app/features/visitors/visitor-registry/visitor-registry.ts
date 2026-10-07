import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { parseApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { toIsoDate } from '../../../core/utils/date';
import { triggerBlobDownload } from '../../../core/utils/file-download';
import { injectIsHandset } from '../../../core/utils/handset';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { RecordCard } from '../../../shared/components/record-card/record-card';
import { RecordCardData } from '../../../shared/components/record-card/record-card.model';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { VisitEditDialog } from '../visit-edit-dialog/visit-edit-dialog';
import { VisitForm } from '../visit-form/visit-form';
import { VISITOR_TYPES, VISITOR_TYPE_LABELS, Visit, VisitorType } from '../visitor.model';
import { VisitorService } from '../visitor.service';

const PAGE_SIZE = 20;
const PRESENT_LIMIT = 200;
const SEARCH_DEBOUNCE_MS = 300;

// Registre des visiteurs (docs/visitors.md §7) : saisie rapide en tête, personnes présentes avec
// bouton « Sortie », historique filtrable ; export CSV réservé à l'administrateur (audité).
@Component({
  selector: 'app-visitor-registry',
  imports: [
    DatePipe,
    EmptyState,
    RecordCard,
    VisitForm,
    MatButtonModule,
    MatChipsModule,
    MatDatepickerModule,
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
  templateUrl: './visitor-registry.html',
  styleUrls: ['../../../shared/styles/list-page.css', './visitor-registry.css'],
})
export class VisitorRegistry {
  protected readonly isHandset = injectIsHandset();
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly visitorService = inject(VisitorService);
  private readonly successNotifier = inject(SuccessNotifier);

  protected readonly canExport = computed(() => this.auth.hasRole('clinic_admin'));
  protected readonly types = VISITOR_TYPES;
  protected readonly typeLabels = VISITOR_TYPE_LABELS;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly displayedColumns = ['visitor', 'type', 'visited', 'checked_in_at', 'checked_out_at', 'actions'];

  // Filtres de l'historique.
  protected readonly page = signal(1);
  protected readonly type = signal<VisitorType | ''>('');
  protected readonly search = signal('');
  protected readonly dateFrom = signal<string | null>(null);
  protected readonly dateTo = signal<string | null>(null);
  private searchDebounceHandle?: ReturnType<typeof setTimeout>;

  private readonly historyParams = computed(() => ({
    ...(this.type() ? { visitor_type: this.type() } : {}),
    ...(this.search() ? { search: this.search() } : {}),
    ...(this.dateFrom() ? { date_from: this.dateFrom()! } : {}),
    ...(this.dateTo() ? { date_to: this.dateTo()! } : {}),
  }));

  protected readonly presentResource = httpResource<Paginated<Visit>>(
    () => ({ url: this.visitorService.url, params: { present: 'true', page_size: PRESENT_LIMIT } }),
    { defaultValue: emptyPage<Visit>() },
  );
  protected readonly historyResource = httpResource<Paginated<Visit>>(
    () => ({ url: this.visitorService.url, params: { page: this.page(), ...this.historyParams() } }),
    { defaultValue: emptyPage<Visit>() },
  );

  protected readonly present = computed(() => this.presentResource.value().results);
  protected readonly history = computed(() => this.historyResource.value().results);
  protected readonly pending = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);

  protected isToday(visit: Visit): boolean {
    return new Date(visit.checked_in_at).toDateString() === new Date().toDateString();
  }

  protected typeLabel(visit: Visit): string {
    return VISITOR_TYPE_LABELS[visit.visitor_type];
  }

  protected cardFor(visit: Visit): RecordCardData {
    return {
      title: visit.visitor_name,
      subtitle: this.typeLabel(visit),
      icon: 'badge',
      status: visit.is_present
        ? { label: translate('visitors.present'), tone: 'info' }
        : visit.auto_closed
          ? { label: translate('visitors.autoClosed'), tone: 'warning' }
          : { label: translate('visitors.left'), tone: 'neutral' },
      fields: [
        { label: translate('visitors.purpose'), value: visit.purpose },
        { label: translate('visitors.visited'), value: visit.visited_display || '—' },
        { label: translate('visitors.checkedInAt'), value: visit.checked_in_at, date: 'short' },
        ...(visit.checked_out_at ? [{ label: translate('visitors.checkedOutAt'), value: visit.checked_out_at, date: 'short' }] : []),
      ],
    };
  }

  protected onCheckedIn(visit: Visit): void {
    this.successNotifier.show(translate('visitors.checkedIn', { name: visit.visitor_name }));
    this.reload();
  }

  protected checkOut(visit: Visit): void {
    this.pending.set(visit.id);
    this.error.set(null);
    this.visitorService.checkOut(visit.id).subscribe({
      next: () => {
        this.pending.set(null);
        this.successNotifier.show(translate('visitors.checkedOut', { name: visit.visitor_name }));
        this.reload();
      },
      error: (error) => {
        this.pending.set(null);
        this.error.set(parseApiError(error, translate('visitors.saveError')).message);
      },
    });
  }

  protected edit(visit: Visit): void {
    const ref = this.dialog.open(VisitEditDialog, { width: '720px', maxWidth: '95vw', data: visit });
    ref.afterClosed().subscribe((saved?: Visit) => {
      if (saved) {
        this.successNotifier.show(translate('visitors.updated'));
        this.reload();
      }
    });
  }

  protected onSearchInput(value: string): void {
    clearTimeout(this.searchDebounceHandle);
    this.searchDebounceHandle = setTimeout(() => {
      this.search.set(value.trim());
      this.page.set(1);
    }, SEARCH_DEBOUNCE_MS);
  }

  protected onTypeChange(type: VisitorType | ''): void {
    this.type.set(type);
    this.page.set(1);
  }

  protected onDateChange(which: 'from' | 'to', event: MatDatepickerInputEvent<Date>): void {
    (which === 'from' ? this.dateFrom : this.dateTo).set(event.value ? toIsoDate(event.value) : null);
    this.page.set(1);
  }

  protected onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
  }

  protected exportCsv(): void {
    this.visitorService
      .exportCsv(this.historyParams())
      .subscribe((blob) => triggerBlobDownload(blob, translate('visitors.exportFilename')));
  }

  private reload(): void {
    this.presentResource.reload();
    this.historyResource.reload();
  }
}
