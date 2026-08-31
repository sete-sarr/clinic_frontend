import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
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
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import {
  DEPARTMENT_STATUS_LABELS,
  DEPARTMENT_TYPE_LABELS,
  Department,
  DepartmentStatus,
} from '../../../core/models/department.model';
import { parseApiError } from '../../../core/api/api-error';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { SuccessNotifier } from '../../../shared/notifications/success-notifier';
import { DepartmentForm } from '../department-form/department-form';
import { DepartmentService } from '../department.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-department-list',
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
  templateUrl: './department-list.html',
  styleUrl: './department-list.css',
})
export class DepartmentList {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly departmentService = inject(DepartmentService);
  private readonly successNotifier = inject(SuccessNotifier);

  readonly status = signal<DepartmentStatus | undefined>(undefined);
  readonly page = signal(1);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly typeLabels = DEPARTMENT_TYPE_LABELS;
  protected readonly statusLabels = DEPARTMENT_STATUS_LABELS;
  protected readonly displayedColumns = ['name', 'code', 'type', 'status', 'actions'];

  protected readonly departmentsResource = httpResource<Paginated<Department>>(
    () => ({
      url: `${environment.apiBaseUrl}/departments/`,
      params: {
        page: this.page(),
        ...(this.status() ? { status: this.status()! } : {}),
      },
    }),
    { defaultValue: emptyPage<Department>() },
  );

  protected readonly dataSource = new MatTableDataSource<Department>([]);
  protected readonly totalCount = computed(() => this.departmentsResource.value().count);
  protected readonly actionPending = signal<number | null>(null);
  protected readonly actionError = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.dataSource.data = this.departmentsResource.value().results;
    });
  }

  protected onStatusFilterChange(value: string): void {
    this.status.set((value || undefined) as DepartmentStatus | undefined);
    this.page.set(1);
  }

  protected onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
  }

  protected typeLabel(department: Department): string {
    return this.typeLabels[department.department_type];
  }

  protected statusLabel(department: Department): string {
    return this.statusLabels[department.status];
  }

  protected openCreate(): void {
    const ref = this.dialog.open(DepartmentForm, { width: '640px', maxWidth: '95vw', autoFocus: 'first-tabbable' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.departmentsResource.reload();
      }
    });
  }

  protected openEdit(department: Department): void {
    const ref = this.dialog.open(DepartmentForm, {
      width: '640px',
      maxWidth: '95vw',
      data: { id: String(department.id) },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.departmentsResource.reload();
      }
    });
  }

  protected async toggleActive(department: Department): Promise<void> {
    this.actionPending.set(department.id);
    this.actionError.set(null);
    try {
      const request$ =
        department.status === 'inactive'
          ? this.departmentService.activate(department.id)
          : this.departmentService.deactivate(department.id);
      await firstValueFrom(request$);
      this.departmentsResource.reload();
    } catch (error) {
      const apiError = parseApiError(error, 'Impossible de modifier le statut de ce département.');
      this.actionError.set(apiError.message);
    } finally {
      this.actionPending.set(null);
    }
  }

  protected async toggleArchived(department: Department): Promise<void> {
    this.actionPending.set(department.id);
    this.actionError.set(null);
    try {
      const request$ =
        department.status === 'archived'
          ? this.departmentService.restore(department.id)
          : this.departmentService.archive(department.id);
      await firstValueFrom(request$);
      this.successNotifier.show(
        department.status === 'archived' ? 'Département restauré avec succès.' : 'Département archivé avec succès.',
      );
      this.departmentsResource.reload();
    } catch (error) {
      const apiError = parseApiError(error, 'Impossible de modifier ce département.');
      this.actionError.set(apiError.message);
    } finally {
      this.actionPending.set(null);
    }
  }
}
