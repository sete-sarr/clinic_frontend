import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { parseApiError } from '../../../core/api/api-error';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { Medication } from '../../../core/models/pharmacy.model';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { MedicationForm } from '../medication-form/medication-form';
import { MedicationService } from '../medication.service';
import { StockBatchForm } from '../stock-batch-form/stock-batch-form';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-medication-list',
  imports: [
    EmptyState,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './medication-list.html',
  styleUrl: './medication-list.css',
})
export class MedicationList {
  private readonly dialog = inject(MatDialog);
  private readonly medicationService = inject(MedicationService);
  private readonly successNotifier = inject(SuccessNotifier);

  readonly page = signal(1);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly displayedColumns = ['name', 'unit', 'stock', 'thresholds', 'status', 'actions'];

  protected readonly medicationsResource = httpResource<Paginated<Medication>>(
    () => ({ url: `${environment.apiBaseUrl}/pharmacy/medications/`, params: { page: this.page() } }),
    { defaultValue: emptyPage<Medication>() },
  );

  protected readonly dataSource = new MatTableDataSource<Medication>([]);
  protected readonly totalCount = computed(() => this.medicationsResource.value().count);
  protected readonly actionPending = signal<number | null>(null);
  protected readonly actionError = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.dataSource.data = this.medicationsResource.value().results;
    });
  }

  protected onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
  }

  // Statut visuel toujours doublé d'un libellé texte (jamais la couleur seule, design-system/colors.md).
  protected stockStatus(medication: Medication): 'low' | 'over' | 'ok' {
    if (medication.low_stock_alerted) return 'low';
    if (medication.overstock_alerted) return 'over';
    return 'ok';
  }

  protected stockStatusLabel(medication: Medication): string {
    switch (this.stockStatus(medication)) {
      case 'low':
        return 'Stock bas';
      case 'over':
        return 'Surstock';
      default:
        return 'Normal';
    }
  }

  protected openCreate(): void {
    const ref = this.dialog.open(MedicationForm, { width: '640px', maxWidth: '95vw', autoFocus: 'first-tabbable' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.medicationsResource.reload();
      }
    });
  }

  protected openEdit(medication: Medication): void {
    const ref = this.dialog.open(MedicationForm, {
      width: '640px',
      maxWidth: '95vw',
      data: { id: String(medication.id) },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.medicationsResource.reload();
      }
    });
  }

  protected openReceiveBatch(medication: Medication): void {
    const ref = this.dialog.open(StockBatchForm, {
      width: '640px',
      maxWidth: '95vw',
      data: { medicationId: medication.id, medicationName: medication.name },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.successNotifier.show('Lot réceptionné avec succès, stock mis à jour.');
        this.medicationsResource.reload();
      }
    });
  }

  protected async toggleArchived(medication: Medication): Promise<void> {
    this.actionPending.set(medication.id);
    this.actionError.set(null);
    try {
      const request$ = medication.is_active
        ? this.medicationService.archive(medication.id)
        : this.medicationService.restore(medication.id);
      await firstValueFrom(request$);
      this.successNotifier.show(
        medication.is_active ? 'Médicament archivé avec succès.' : 'Médicament restauré avec succès.',
      );
      this.medicationsResource.reload();
    } catch (error) {
      const apiError = parseApiError(error, 'Impossible de modifier ce médicament.');
      this.actionError.set(apiError.message);
    } finally {
      this.actionPending.set(null);
    }
  }
}
