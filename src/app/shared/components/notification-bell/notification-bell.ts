import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe } from '@jsverse/transloco';

import { Paginated } from '../../../core/models/pagination.model';
import { InAppNotification, NOTIFICATION_CATEGORY_ICONS } from '../../../core/notifications/notification.model';
import { NotificationService } from '../../../core/notifications/notification.service';

const POLL_INTERVAL_MS = 60_000;
const RECENT_COUNT = 6;

// Cloche de l'en-tête : compteur de non-lues (rafraîchi toutes les 60 s et au retour sur l'onglet) et
// panneau des dernières notifications. Un clic ouvre le lien de la notification et la marque comme lue.
@Component({
  selector: 'app-notification-bell',
  imports: [
    DatePipe,
    RouterLink,
    MatBadgeModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    TranslocoPipe,
  ],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBell {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly service = inject(NotificationService);

  protected readonly unreadCount = this.service.unreadCount;
  protected readonly recent = signal<InAppNotification[]>([]);
  protected readonly loading = signal(false);
  protected readonly icons = NOTIFICATION_CATEGORY_ICONS;

  constructor() {
    this.service.refreshCount();
    const timer = setInterval(() => this.refreshIfVisible(), POLL_INTERVAL_MS);
    const onVisibility = () => this.refreshIfVisible();
    document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    });
  }

  private refreshIfVisible(): void {
    if (document.visibilityState === 'visible') {
      this.service.refreshCount();
    }
  }

  protected loadRecent(): void {
    this.loading.set(true);
    this.http
      .get<Paginated<InAppNotification>>(this.service.url, { params: { archived: 'false' } })
      .subscribe({
        next: (page) => {
          this.recent.set(page.results.slice(0, RECENT_COUNT));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    this.service.refreshCount();
  }

  protected open(notification: InAppNotification): void {
    const navigate = () => notification.link && this.router.navigateByUrl(notification.link);
    if (notification.is_read) {
      navigate();
      return;
    }
    this.service.markRead(notification).subscribe({ complete: navigate, error: navigate });
  }

  protected markAllRead(event: MouseEvent): void {
    // Le panneau reste ouvert : les éléments passent simplement à l'état « lu ».
    event.stopPropagation();
    this.service.markAllRead().subscribe(() => {
      this.recent.update((items) => items.map((item) => ({ ...item, is_read: true })));
    });
  }
}
