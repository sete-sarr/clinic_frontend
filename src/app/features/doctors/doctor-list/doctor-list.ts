import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, numberAttribute } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { Doctor } from '../../../core/models/doctor.model';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { DoctorForm } from '../doctor-form/doctor-form';
import { DoctorService } from '../doctor.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-doctor-list',
  imports: [
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
  templateUrl: './doctor-list.html',
  styleUrl: './doctor-list.css',
})
export class DoctorList {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly doctorService = inject(DoctorService);

  readonly isActive = input<string | undefined>();
  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly displayedColumns = ['name', 'specialty', 'professional_number', 'status', 'actions'];
  protected readonly canManage = computed(() => this.auth.hasRole('clinic_admin'));

  protected readonly doctorsResource = httpResource<Paginated<Doctor>>(
    () => ({
      url: `${environment.apiBaseUrl}/doctors/`,
      params: {
        page: this.page(),
        ...(this.isActive() ? { is_active: this.isActive()! } : {}),
      },
    }),
    { defaultValue: emptyPage<Doctor>() },
  );

  protected readonly dataSource = new MatTableDataSource<Doctor>([]);
  protected readonly totalCount = computed(() => this.doctorsResource.value().count);

  constructor() {
    effect(() => {
      this.dataSource.data = this.doctorsResource.value().results;
    });
  }

  protected onStatusFilterChange(value: string): void {
    this.router.navigate([], { queryParams: { isActive: value || null, page: null }, queryParamsHandling: 'merge' });
  }

  protected onPageChange(event: PageEvent): void {
    this.router.navigate([], { queryParams: { page: event.pageIndex + 1 }, queryParamsHandling: 'merge' });
  }

  protected deactivate(doctor: Doctor): void {
    this.doctorService.deactivate(doctor.id).subscribe(() => this.doctorsResource.reload());
  }

  protected openCreate(): void {
    if (!this.canManage()) {
      return;
    }
    const ref = this.dialog.open(DoctorForm, { width: '720px', maxWidth: '95vw', autoFocus: 'first-tabbable' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.doctorsResource.reload();
      }
    });
  }

  protected openEdit(doctor: Doctor): void {
    if (!this.canManage()) {
      return;
    }
    const ref = this.dialog.open(DoctorForm, {
      width: '720px',
      maxWidth: '95vw',
      data: { id: String(doctor.id) },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.doctorsResource.reload();
      }
    });
  }
}
