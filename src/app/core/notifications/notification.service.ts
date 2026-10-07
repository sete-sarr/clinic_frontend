import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { InAppNotification } from './notification.model';

// Centre de notifications in-app (docs/communication-architecture.md § NOTIFICATIONS IN-APP) : l'API ne
// renvoie que les notifications de l'utilisateur connecté. Le compteur de non-lues est partagé entre la
// cloche de l'en-tête et la page « Notifications », qui le rafraîchit après chaque action.
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  readonly url = `${environment.apiBaseUrl}/notifications/`;

  readonly unreadCount = signal(0);

  refreshCount(): void {
    this.http
      .get<{ count: number }>(`${this.url}unread-count/`)
      .subscribe({ next: ({ count }) => this.unreadCount.set(count), error: () => undefined });
  }

  markRead(notification: InAppNotification): Observable<InAppNotification> {
    return this.http.post<InAppNotification>(`${this.url}${notification.id}/read/`, {}).pipe(tap(() => this.refreshCount()));
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.url}read-all/`, {}).pipe(tap(() => this.unreadCount.set(0)));
  }

  archive(notification: InAppNotification): Observable<InAppNotification> {
    return this.http.post<InAppNotification>(`${this.url}${notification.id}/archive/`, {}).pipe(tap(() => this.refreshCount()));
  }
}
