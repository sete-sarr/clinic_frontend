import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, input, numberAttribute, signal } from '@angular/core';
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
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import { STAFF_ROLE_LABELS, StaffMember } from '../../../core/models/staff.model';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { StaffForm } from '../staff-form/staff-form';
import { StaffService } from '../staff.service';
import { RecordCard } from '../../../shared/components/record-card/record-card';
import { RecordCardData, activeStatus } from '../../../shared/components/record-card/record-card.model';
import { Avatar, AvatarKind } from '../../../shared/components/avatar/avatar';
import { injectIsHandset } from '../../../core/utils/handset';
import { apiResource } from '../../../core/api/api-resource';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-staff-list',
  imports: [
    Avatar,
    NgTemplateOutlet,
    RecordCard,
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
    TranslocoPipe,
  ],
  templateUrl: './staff-list.html',
  styleUrl: './staff-list.css',
})
export class StaffList {
  protected readonly isHandset = injectIsHandset();

  protected cardFor(member: StaffMember): RecordCardData {
    const name = `${member.first_name} ${member.last_name}`;
    return {
      title: name,
      subtitle: this.roleLabel(member),
      photo: { src: member.photo, kind: this.avatarKind(member) },
      status: activeStatus(member.is_active),
      muted: !member.is_active,
      fields: [],
    };
  }

  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly staffService = inject(StaffService);

  readonly isActive = input<string | undefined>();
  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly roleLabels = STAFF_ROLE_LABELS;
  protected readonly displayedColumns = ['photo', 'name', 'role', 'status', 'actions'];
  protected readonly currentUserId = computed(() => this.auth.user()?.id ?? null);
  protected readonly canManage = computed(() => this.auth.hasRole('clinic_admin'));

  protected readonly staffResource = apiResource<Paginated<StaffMember>>(
    () => ({
      url: `${environment.apiBaseUrl}/accounts/staff/`,
      params: {
        page: this.page(),
        ...(this.isActive() ? { is_active: this.isActive()! } : {}),
      },
    }),
    { defaultValue: emptyPage<StaffMember>() },
  );

  protected readonly dataSource = new MatTableDataSource<StaffMember>([]);
  protected readonly totalCount = computed(() => this.staffResource.value().count);
  protected readonly actionPending = signal<number | null>(null);

  constructor() {
    effect(() => {
      this.dataSource.data = this.staffResource.value().results;
    });
  }

  protected onStatusFilterChange(value: string): void {
    this.router.navigate([], { queryParams: { isActive: value || null, page: null }, queryParamsHandling: 'merge' });
  }

  protected onPageChange(event: PageEvent): void {
    this.router.navigate([], { queryParams: { page: event.pageIndex + 1 }, queryParamsHandling: 'merge' });
  }

  protected isSelf(member: StaffMember): boolean {
    return member.id === this.currentUserId();
  }

  // Les médecins figurent aussi dans cette liste (rôle « doctor », en lecture seule — backend
  // StaffListSerializer), hors des rôles attribuables de STAFF_ROLE_LABELS.
  protected roleLabel(member: StaffMember): string {
    return this.roleLabels[member.role] ?? translate(`roles.${member.role}`);
  }

  protected avatarKind(member: StaffMember): AvatarKind {
    return (member.role as string) === 'doctor' ? 'doctor' : 'staff';
  }

  protected async toggleActive(member: StaffMember): Promise<void> {
    this.actionPending.set(member.id);
    try {
      const request$ = member.is_active ? this.staffService.deactivate(member.id) : this.staffService.reactivate(member.id);
      await firstValueFrom(request$);
      this.staffResource.reload();
    } finally {
      this.actionPending.set(null);
    }
  }

  protected openCreate(): void {
    if (!this.canManage()) {
      return;
    }
    const ref = this.dialog.open(StaffForm, { width: '720px', maxWidth: '95vw', autoFocus: 'first-tabbable' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.staffResource.reload();
      }
    });
  }

  protected openEdit(member: StaffMember): void {
    if (!this.canManage()) {
      return;
    }
    const ref = this.dialog.open(StaffForm, {
      width: '720px',
      maxWidth: '95vw',
      data: { id: String(member.id) },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.staffResource.reload();
      }
    });
  }
}
