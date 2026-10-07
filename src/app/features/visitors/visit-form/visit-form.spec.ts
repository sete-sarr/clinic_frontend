import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { environment } from '../../../../environments/environment';
import { translocoTesting } from '../../../core/i18n/transloco-testing';
import { VisitForm } from './visit-form';

const URL = `${environment.apiBaseUrl}/visitors/`;

// La personne visitée est envoyée sous une seule forme : séjour, membre du personnel ou texte libre.
describe('VisitForm', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [translocoTesting('fr')],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function create() {
    const fixture = TestBed.createComponent(VisitForm);
    fixture.detectChanges();
    http.match((request) => request.url === `${URL}targets/`).forEach((request) => request.flush({ admissions: [], staff: [] }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const form = fixture.componentInstance as any;
    form.set('visitor_name', 'Mamadou Sy');
    form.set('purpose', 'Visite');
    return form;
  }

  it('envoie un texte libre quand aucune personne n’est choisie dans la liste', () => {
    const form = create();
    form.onTargetInput('Service comptabilité');
    form.submit();
    const request = http.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(request.request.body).toMatchObject({ visited_free_text: 'Service comptabilité', visited_admission: null, visited_staff: null });
  });

  it('envoie le séjour choisi, sans texte libre', () => {
    const form = create();
    form.onTargetSelected({ kind: 'admission', id: 7, label: 'Grace Hopper (Médecine · 12 — A)' });
    form.submit();
    const request = http.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(request.request.body).toMatchObject({ visited_admission: 7, visited_staff: null, visited_free_text: '' });
  });

  it('refuse l’envoi sans nom ni motif', () => {
    const form = create();
    form.set('purpose', '');
    form.submit();
    http.expectNone((r) => r.method === 'POST');
    expect(form.error()).toBeTruthy();
  });
});
