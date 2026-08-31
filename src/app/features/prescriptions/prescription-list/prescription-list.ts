import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, numberAttribute } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { PRESCRIPTION_STATUS_LABELS, Prescription, PrescriptionStatus } from '../prescription.model';
import { PrescriptionForm } from '../prescription-form/prescription-form';
import { PrescriptionService } from '../prescription.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-prescription-list',
  imports: [
    DatePipe,
    EmptyState,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './prescription-list.html',
  styleUrl: './prescription-list.css',
})
export class PrescriptionList {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly prescriptionService = inject(PrescriptionService);
  protected readonly auth = inject(AuthService);

  readonly status = input<PrescriptionStatus | undefined>();
  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly statusOptions = Object.entries(PRESCRIPTION_STATUS_LABELS) as [
    PrescriptionStatus,
    string,
  ][];
  protected readonly displayedColumns = ['created_at', 'patient', 'doctor', 'status', 'actions'];

  protected readonly prescriptionsResource = httpResource<Paginated<Prescription>>(
    () => ({
      url: `${environment.apiBaseUrl}/prescriptions/`,
      params: {
        page: this.page(),
        ...(this.status() ? { status: this.status()! } : {}),
      },
    }),
    { defaultValue: emptyPage<Prescription>() },
  );

  protected readonly dataSource = new MatTableDataSource<Prescription>([]);
  protected readonly totalCount = computed(() => this.prescriptionsResource.value().count);

  protected readonly canManage = computed(() => this.auth.hasRole('doctor', 'clinic_admin'));

  constructor() {
    effect(() => {
      this.dataSource.data = this.prescriptionsResource.value().results;
    });
  }

  protected statusLabel(prescription: Prescription): string {
    return PRESCRIPTION_STATUS_LABELS[prescription.status];
  }

  protected onStatusFilterChange(status: PrescriptionStatus | ''): void {
    this.router.navigate([], { queryParams: { status: status || null, page: null }, queryParamsHandling: 'merge' });
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

  protected openCreate(): void {
    if (!this.canManage()) {
      return;
    }
    const ref = this.dialog.open(PrescriptionForm, { width: '820px', maxWidth: '95vw', autoFocus: 'first-tabbable' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.prescriptionsResource.reload();
      }
    });
  }

  protected openEdit(prescription: Prescription): void {
    if (!this.canManage()) {
      return;
    }
    const ref = this.dialog.open(PrescriptionForm, {
      width: '820px',
      maxWidth: '95vw',
      data: { id: String(prescription.id) },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.prescriptionsResource.reload();
      }
    });
  }
}
