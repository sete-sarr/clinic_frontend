import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

// Renouvellement automatique du jeton d'accès (SIMPLE_JWT : accès 15 min, rafraîchissement 7 jours,
// rotation + révocation de l'ancien jeton de rafraîchissement).
const API = environment.apiBaseUrl;
const REFRESH_URL = `${API}/auth/token/refresh/`;
const user = { id: 1, username: 'u', email: 'u@x', first_name: 'A', last_name: 'B', clinic: 1, roles: ['clinic_admin'], doctor_id: null };

describe('authInterceptor — renouvellement du jeton', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('clinic_access_token', 'access-1');
    localStorage.setItem('clinic_refresh_token', 'refresh-1');
    localStorage.setItem('clinic_user', JSON.stringify(user));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  const unauthorized = { status: 401, statusText: 'Unauthorized' };

  it('conserve le nouveau jeton de rafraîchissement (rotation) et rejoue la requête', async () => {
    const result = firstValueFrom(http.get(`${API}/patients/`));
    backend.expectOne(`${API}/patients/`).flush({}, unauthorized);

    const refresh = backend.expectOne(REFRESH_URL);
    expect(refresh.request.body).toEqual({ refresh: 'refresh-1' });
    refresh.flush({ access: 'access-2', refresh: 'refresh-2' });

    const retried = backend.expectOne(`${API}/patients/`);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer access-2');
    retried.flush({ ok: true });

    await expect(result).resolves.toEqual({ ok: true });
    expect(localStorage.getItem('clinic_refresh_token')).toBe('refresh-2');
    expect(localStorage.getItem('clinic_access_token')).toBe('access-2');
  });

  it('le renouvellement suivant utilise le jeton tourné, pas l’ancien (révoqué)', async () => {
    const first = firstValueFrom(http.get(`${API}/patients/`));
    backend.expectOne(`${API}/patients/`).flush({}, unauthorized);
    backend.expectOne(REFRESH_URL).flush({ access: 'access-2', refresh: 'refresh-2' });
    backend.expectOne(`${API}/patients/`).flush({});
    await first;

    const second = firstValueFrom(http.get(`${API}/doctors/`));
    backend.expectOne(`${API}/doctors/`).flush({}, unauthorized);
    const refresh = backend.expectOne(REFRESH_URL);
    expect(refresh.request.body).toEqual({ refresh: 'refresh-2' });
    refresh.flush({ access: 'access-3', refresh: 'refresh-3' });
    backend.expectOne(`${API}/doctors/`).flush({});
    await second;
    expect(localStorage.getItem('clinic_refresh_token')).toBe('refresh-3');
  });

  it('des requêtes simultanées en 401 ne déclenchent qu’un seul renouvellement', async () => {
    const results = [`${API}/patients/`, `${API}/doctors/`, `${API}/appointments/`].map((url) => firstValueFrom(http.get(url)));
    for (const url of [`${API}/patients/`, `${API}/doctors/`, `${API}/appointments/`]) {
      backend.expectOne(url).flush({}, unauthorized);
    }

    backend.expectOne(REFRESH_URL).flush({ access: 'access-2', refresh: 'refresh-2' });
    for (const url of [`${API}/patients/`, `${API}/doctors/`, `${API}/appointments/`]) {
      const retried = backend.expectOne(url);
      expect(retried.request.headers.get('Authorization')).toBe('Bearer access-2');
      retried.flush({});
    }
    await Promise.all(results);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('un jeton de rafraîchissement refusé termine la session', async () => {
    const result = firstValueFrom(http.get(`${API}/patients/`));
    backend.expectOne(`${API}/patients/`).flush({}, unauthorized);
    backend.expectOne(REFRESH_URL).flush({ code: 'token_not_valid' }, unauthorized);
    backend.match(`${API}/auth/logout/`).forEach((request) => request.flush({}));

    await expect(result).rejects.toBeTruthy();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
  });

  it('une panne réseau ou un serveur indisponible pendant le renouvellement ne déconnecte pas', async () => {
    const result = firstValueFrom(http.get(`${API}/patients/`));
    backend.expectOne(`${API}/patients/`).flush({}, unauthorized);
    backend.expectOne(REFRESH_URL).flush({}, { status: 503, statusText: 'Service Unavailable' });

    await expect(result).rejects.toBeTruthy();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(localStorage.getItem('clinic_refresh_token')).toBe('refresh-1');
  });

  it('une erreur de validation sur la requête rejouée ne déconnecte pas', async () => {
    const result = firstValueFrom(http.post(`${API}/patients/`, {}));
    backend.expectOne(`${API}/patients/`).flush({}, unauthorized);
    backend.expectOne(REFRESH_URL).flush({ access: 'access-2', refresh: 'refresh-2' });
    backend.expectOne(`${API}/patients/`).flush({ code: 400 }, { status: 400, statusText: 'Bad Request' });

    await expect(result).rejects.toBeTruthy();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
