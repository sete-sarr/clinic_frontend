import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { environment } from '../../../../environments/environment';
import { translocoTesting } from '../../../core/i18n/transloco-testing';
import { NotificationService } from '../../../core/notifications/notification.service';
import { NotificationList } from './notification-list';

const URL = `${environment.apiBaseUrl}/notifications/`;
const notification = {
  id: 7, category: 'appointment', priority: 'medium', title: 'Patient arrivé : Grace Hopper', body: 'Ticket CHK-2026-00001',
  link: '/appointments?checkedIn=true', is_read: false, read_at: null, archived_at: null, created_at: '2026-10-07T09:00:00Z',
};

describe('NotificationList', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [translocoTesting('fr')],
      providers: [
        provideRouter([{ path: 'notifications', component: NotificationList }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function open(url: string) {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, NotificationList);
    TestBed.tick();
    http.expectOne(`${URL}unread-count/`).flush({ count: 1 });
    return harness;
  }

  // Laisse la réponse HTTP se propager au httpResource puis rend la vue.
  async function settle() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    TestBed.tick();
  }

  function listRequest() {
    return http.expectOne((request) => request.url === URL && request.method === 'GET');
  }

  it('par défaut, demande les notifications non archivées', async () => {
    await open('/notifications');
    const request = listRequest();
    expect(request.request.params.get('archived')).toBe('false');
    expect(request.request.params.has('unread')).toBe(false);
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('les filtres de l’URL sont transmis à l’API', async () => {
    await open('/notifications?state=unread&category=laboratory&search=Grace');
    const params = listRequest().request.params;
    expect(params.get('unread')).toBe('true');
    expect(params.get('category')).toBe('laboratory');
    expect(params.get('search')).toBe('Grace');
  });

  it('archiver appelle l’API puis recharge la liste et le compteur', async () => {
    const harness = await open('/notifications');
    listRequest().flush({ count: 1, next: null, previous: null, results: [notification] });
    await settle();
    const archiveButton = harness.routeNativeElement!.querySelector<HTMLButtonElement>('[aria-label="Archiver"]')!;
    archiveButton.click();
    http.expectOne(`${URL}7/archive/`).flush({ ...notification, archived_at: '2026-10-07T10:00:00Z', is_read: true });
    http.expectOne(`${URL}unread-count/`).flush({ count: 0 });
    await settle();
    listRequest().flush({ count: 0, next: null, previous: null, results: [] });
    expect(TestBed.inject(NotificationService).unreadCount()).toBe(0);
  });
});
