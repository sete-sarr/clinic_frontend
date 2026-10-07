import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';

import { Paginated, emptyPage } from '../../../core/models/pagination.model';
import {
  InAppNotification,
  NOTIFICATION_CATEGORY_ICONS,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_PRIORITY_LABELS,
  NOTIFICATION_PRIORITY_TONES,
  NotificationCategory,
} from '../../../core/notifications/notification.model';
import { NotificationService } from '../../../core/notifications/notification.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// « Actives » = non archivées (lues ou non) ; « Archivées » : conservées 90 jours puis supprimées.
export type NotificationState = 'active' | 'unread' | 'archived';
const STATE_PARAMS: Record<NotificationState, Record<string, string>> = {
  active: { archived: 'false' },
  unread: { archived: 'false', unread: 'true' },
  archived: { archived: 'true' },
};

@Component({
  selector: 'app-notification-list',
  imports: [
    DatePipe,
    EmptyState,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    TranslocoPipe,
  ],
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.css',
})
export class NotificationList {
  private readonly router = inject(Router);
  private readonly service = inject(NotificationService);

  readonly state = input<NotificationState, unknown>('active', {
    transform: (value: unknown) => (value === 'unread' || value === 'archived' ? value : 'active'),
  });
  readonly category = input<NotificationCategory | undefined>();
  readonly search = input<string | undefined>();
  readonly page = input(1, { transform: (value: unknown) => numberAttribute(value, 1) });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly states: NotificationState[] = ['active', 'unread', 'archived'];
  protected readonly categoryOptions = Object.entries(NOTIFICATION_CATEGORY_LABELS) as [NotificationCategory, string][];
  protected readonly categoryLabels = NOTIFICATION_CATEGORY_LABELS;
  protected readonly categoryIcons = NOTIFICATION_CATEGORY_ICONS;
  protected readonly priorityLabels = NOTIFICATION_PRIORITY_LABELS;
  protected readonly priorityTones = NOTIFICATION_PRIORITY_TONES;
  protected readonly unreadCount = this.service.unreadCount;

  protected readonly searchInput = signal('');
  private searchDebounceHandle?: ReturnType<typeof setTimeout>;

  protected readonly notificationsResource = httpResource<Paginated<InAppNotification>>(
    () => ({
      url: this.service.url,
      params: {
        page: this.page(),
        ...STATE_PARAMS[this.state()],
        ...(this.category() ? { category: this.category()! } : {}),
        ...(this.search() ? { search: this.search()! } : {}),
      },
    }),
    { defaultValue: emptyPage<InAppNotification>() },
  );

  protected readonly notifications = computed(() => this.notificationsResource.value().results);
  protected readonly totalCount = computed(() => this.notificationsResource.value().count);

  constructor() {
    this.service.refreshCount();
    effect(() => {
      this.searchInput.set(this.search() ?? '');
    });
  }

  protected open(notification: InAppNotification): void {
    const navigate = () => this.router.navigateByUrl(notification.link);
    if (notification.is_read) {
      navigate();
      return;
    }
    this.service.markRead(notification).subscribe({ complete: navigate, error: navigate });
  }

  protected markRead(notification: InAppNotification): void {
    this.service.markRead(notification).subscribe(() => this.notificationsResource.reload());
  }

  protected archive(notification: InAppNotification): void {
    this.service.archive(notification).subscribe(() => this.notificationsResource.reload());
  }

  protected markAllRead(): void {
    this.service.markAllRead().subscribe(() => this.notificationsResource.reload());
  }

  protected onStateChange(state: NotificationState): void {
    this.navigate({ state: state === 'active' ? null : state });
  }

  protected onCategoryChange(category: NotificationCategory | ''): void {
    this.navigate({ category: category || null });
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
