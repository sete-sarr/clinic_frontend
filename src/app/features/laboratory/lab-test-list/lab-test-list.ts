import { NgTemplateOutlet } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { parseApiError } from '../../../core/api/api-error';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { injectIsHandset } from '../../../core/utils/handset';
import { AuthService } from '../../../core/auth/auth.service';
import { DEFAULT_CURRENCY, MoneyPipe } from '../../../core/utils/money';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { RecordCard } from '../../../shared/components/record-card/record-card';
import { RecordCardData } from '../../../shared/components/record-card/record-card.model';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { LabTestForm } from '../lab-test-form/lab-test-form';
import { LabTest, referenceRange } from '../laboratory.model';
import { LaboratoryService } from '../laboratory.service';

const PAGE_SIZE = 20;

// Catalogue d'examens de la clinique (administrateur — permissions-matrix.md § EXAMEN DE
// LABORATOIRE). Archivage uniquement, jamais de suppression.
@Component({
  selector: 'app-lab-test-list',
  imports: [
    NgTemplateOutlet,
    EmptyState,
    MoneyPipe,
    RecordCard,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    TranslocoPipe,
  ],
  templateUrl: './lab-test-list.html',
  styleUrl: '../laboratory-list.css',
})
export class LabTestList {
  protected readonly isHandset = injectIsHandset();
  private readonly dialog = inject(MatDialog);
  private readonly laboratoryService = inject(LaboratoryService);
  private readonly successNotifier = inject(SuccessNotifier);

  // Prix du catalogue : devise actuelle de la clinique (docs/i18n.md §8).
  protected readonly currency = inject(AuthService).user()?.clinic_currency ?? DEFAULT_CURRENCY;
  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly pageSize = PAGE_SIZE;
  protected readonly referenceRange = referenceRange;
  protected readonly displayedColumns = ['code', 'name', 'unit', 'reference', 'price', 'status', 'actions'];

  protected readonly testsResource = httpResource<Paginated<LabTest>>(
    () => ({
      url: this.laboratoryService.testsUrl,
      params: { page: this.page(), ...(this.search() ? { search: this.search() } : {}) },
    }),
    { defaultValue: emptyPage<LabTest>() },
  );

  protected readonly tests = computed(() => this.testsResource.value().results);
  protected readonly totalCount = computed(() => this.testsResource.value().count);
  protected readonly actionPending = signal<number | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected cardFor(test: LabTest): RecordCardData {
    return {
      title: test.name,
      subtitle: test.code,
      icon: 'biotech',
      status: test.is_active
        ? { label: translate('common.active'), tone: 'success' }
        : { label: translate('common.archived'), tone: 'neutral' },
      muted: !test.is_active,
      fields: [
        { label: translate('laboratory.unit'), value: test.unit || '—' },
        { label: translate('laboratory.reference'), value: referenceRange(test.reference_min, test.reference_max) },
        { label: translate('laboratory.price'), value: test.price, currency: this.currency },
      ],
    };
  }

  protected onSearch(value: string): void {
    this.search.set(value.trim());
    this.page.set(1);
  }

  protected onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
  }

  protected openForm(test?: LabTest): void {
    const ref = this.dialog.open(LabTestForm, { width: '640px', maxWidth: '95vw', data: test ?? null });
    ref.afterClosed().subscribe((saved) => saved && this.testsResource.reload());
  }

  protected async toggleArchived(test: LabTest): Promise<void> {
    this.actionPending.set(test.id);
    this.actionError.set(null);
    try {
      await firstValueFrom(this.laboratoryService.setTestArchived(test, test.is_active));
      this.successNotifier.show(translate(test.is_active ? 'laboratory.testArchived' : 'laboratory.testRestored'));
      this.testsResource.reload();
    } catch (error) {
      this.actionError.set(parseApiError(error, translate('laboratory.saveError')).message);
    } finally {
      this.actionPending.set(null);
    }
  }
}
