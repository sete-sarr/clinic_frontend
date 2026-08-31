import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { environment } from '../../../../environments/environment';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { PRESCRIPTION_STATUS_LABELS, Prescription } from '../../prescriptions/prescription.model';
import { PrescriptionService } from '../../prescriptions/prescription.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-portal-prescriptions',
  imports: [
    DatePipe,
    EmptyState,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './portal-prescriptions.html',
  styleUrl: './portal-prescriptions.css',
})
export class PortalPrescriptions {
  private readonly router = inject(Router);
  private readonly prescriptionService = inject(PrescriptionService);

  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly statusLabels = PRESCRIPTION_STATUS_LABELS;

  // Same endpoint the staff prescription-list uses — CanManagePrescriptions already scopes SAFE
  // methods to the patient's own prescriptions.
  protected readonly prescriptionsResource = httpResource<Paginated<Prescription>>(
    () => ({ url: `${environment.apiBaseUrl}/prescriptions/`, params: { page: this.page() } }),
    { defaultValue: emptyPage<Prescription>() },
  );

  protected readonly totalCount = computed(() => this.prescriptionsResource.value().count);

  protected statusLabel(prescription: Prescription): string {
    return PRESCRIPTION_STATUS_LABELS[prescription.status];
  }

  protected onPageChange(event: PageEvent): void {
    this.router.navigate([], { queryParams: { page: event.pageIndex + 1 }, queryParamsHandling: 'merge' });
  }

  protected downloadPdf(prescription: Prescription): void {
    this.prescriptionService.downloadPdf(prescription.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }
}
