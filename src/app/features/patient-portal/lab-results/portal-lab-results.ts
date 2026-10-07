import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe } from '@jsverse/transloco';

import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { openBlobInNewTab } from '../../../core/utils/file-download';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LabOrder, LabOrderItem, referenceRange } from '../../laboratory/laboratory.model';
import { LaboratoryService } from '../../laboratory/laboratory.service';
import { apiResource } from '../../../core/api/api-resource';

const PAGE_SIZE = 20;

// « Mes résultats » : même endpoint que l'écran du personnel — l'API ne renvoie au patient que ses
// demandes VALIDÉES par le médecin (business/access-policy.md, laboratory/api/views.py).
@Component({
  selector: 'app-portal-lab-results',
  imports: [
    DatePipe,
    EmptyState,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
  ],
  templateUrl: './portal-lab-results.html',
  styleUrl: './portal-lab-results.css',
})
export class PortalLabResults {
  private readonly router = inject(Router);
  private readonly laboratoryService = inject(LaboratoryService);

  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly referenceRange = referenceRange;

  protected readonly ordersResource = apiResource<Paginated<LabOrder>>(
    () => ({ url: this.laboratoryService.ordersUrl, params: { page: this.page() } }),
    { defaultValue: emptyPage<LabOrder>() },
  );

  protected readonly orders = computed(() => this.ordersResource.value().results);
  protected readonly totalCount = computed(() => this.ordersResource.value().count);

  protected onPageChange(event: PageEvent): void {
    this.router.navigate([], { queryParams: { page: event.pageIndex + 1 }, queryParamsHandling: 'merge' });
  }

  protected downloadPdf(order: LabOrder): void {
    this.laboratoryService.downloadPdf(order.id).subscribe((blob) => openBlobInNewTab(blob));
  }

  protected openAttachment(order: LabOrder, item: LabOrderItem): void {
    this.laboratoryService.downloadAttachment(order.id, item.id).subscribe((blob) => openBlobInNewTab(blob));
  }
}
