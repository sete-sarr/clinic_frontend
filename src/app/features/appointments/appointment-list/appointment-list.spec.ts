import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { environment } from '../../../../environments/environment';
import { translocoTesting } from '../../../core/i18n/transloco-testing';
import { AppointmentList } from './appointment-list';

// Régression : les filtres de la liste passent par l'URL (withComponentInputBinding) ; un query
// param dont le nom diffère de l'entrée du composant n'était jamais appliqué (« Arrivés
// uniquement » sans effet).
describe('AppointmentList — filtres de l’URL', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [translocoTesting('fr')],
      providers: [
        provideRouter([{ path: 'appointments', component: AppointmentList }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // Laisse la navigation du routeur aboutir puis rend la vue (whenStable() attendrait aussi la fin
  // des requêtes HTTP en attente, qui ne se terminent que par flush()).
  async function settle() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    TestBed.tick();
  }

  async function requestFor(url: string) {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, AppointmentList);
    TestBed.tick();
    return http.expectOne((request) => request.url === `${environment.apiBaseUrl}/appointments/`);
  }

  it('« Arrivés uniquement » envoie checked_in=true à l’API', async () => {
    const request = await requestFor('/appointments?checkedIn=true');
    expect(request.request.params.get('checked_in')).toBe('true');
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('sans filtre, aucun checked_in n’est envoyé', async () => {
    const request = await requestFor('/appointments');
    expect(request.request.params.has('checked_in')).toBe(false);
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('cocher « Arrivés uniquement » recharge la liste filtrée', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/appointments', AppointmentList);
    TestBed.tick();
    http.expectOne(`${environment.apiBaseUrl}/appointments/?page=1`).flush({ count: 0, next: null, previous: null, results: [] });
    await settle();

    const checkbox = harness.routeNativeElement!.querySelector<HTMLInputElement>('mat-checkbox input')!;
    checkbox.click();
    await settle();

    const request = http.expectOne((r) => r.url === `${environment.apiBaseUrl}/appointments/`);
    expect(request.request.params.get('checked_in')).toBe('true');
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('la recherche par n° patient envoie patient_number à l’API', async () => {
    const request = await requestFor('/appointments?patientNumber=PAT-2026-00002');
    expect(request.request.params.get('patient_number')).toBe('PAT-2026-00002');
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });
});
