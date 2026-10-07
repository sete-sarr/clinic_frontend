import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { apiResource } from './api-resource';

// Régression : une requête en erreur (ex. 404 d'un backend non déployé) faisait lever `value()`
// pendant le rendu, ce qui figeait tout l'affichage — y compris les fenêtres modales ouvertes.
describe('apiResource', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  async function settle() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    TestBed.tick();
  }

  function create<T>(defaultValue: T) {
    return runInInjectionContext(TestBed.inject(Injector), () => apiResource<T>(() => '/api/items/', { defaultValue }));
  }

  it('renvoie la valeur reçue', async () => {
    const resource = create<string[]>([]);
    TestBed.tick();
    http.expectOne('/api/items/').flush(['a']);
    await settle();
    expect(resource.value()).toEqual(['a']);
    expect(resource.error()).toBeUndefined();
  });

  it('renvoie la valeur par défaut, sans lever, quand la requête échoue', async () => {
    const resource = create<string[]>([]);
    TestBed.tick();
    http.expectOne('/api/items/').flush('introuvable', { status: 404, statusText: 'Not Found' });
    await settle();
    expect(() => resource.value()).not.toThrow();
    expect(resource.value()).toEqual([]);
    expect(resource.error()).toBeTruthy();
  });
});
