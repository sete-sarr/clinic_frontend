import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';

import { translocoTesting } from '../i18n/transloco-testing';
import { parseApiError } from './api-error';

const FALLBACK = "Impossible d'enregistrer ce médicament.";

describe('parseApiError', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [translocoTesting('fr')] });
    TestBed.inject(TranslocoService);
  });

  it('returns the backend ApiError unchanged when the body has the standard shape', () => {
    const body = { code: 400, message: 'Nom déjà utilisé.', field: 'name' };
    const error = new HttpErrorResponse({ status: 400, error: body });

    expect(parseApiError(error, FALLBACK)).toEqual(body);
  });

  it('explains a 404 HTML page (endpoint not deployed) instead of the bare fallback', () => {
    const error = new HttpErrorResponse({ status: 404, error: '<!doctype html><h1>Not Found</h1>' });

    const result = parseApiError(error, FALLBACK);

    expect(result.code).toBe(404);
    expect(result.field).toBeNull();
    expect(result.message).toContain(FALLBACK);
    expect(result.message).toContain('erreur 404');
  });

  it('reports an unreachable server on status 0', () => {
    const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });

    expect(parseApiError(error, FALLBACK).message).toContain('Serveur injoignable');
  });

  it('includes the status code for server errors', () => {
    const error = new HttpErrorResponse({ status: 502, error: 'Bad Gateway' });

    expect(parseApiError(error, FALLBACK).message).toContain('erreur 502');
  });

  it('keeps the bare fallback for non-HTTP errors', () => {
    expect(parseApiError(new Error('boom'), FALLBACK)).toEqual({ code: 0, message: FALLBACK, field: null });
  });

  it("explique l'erreur dans la langue de l'interface (anglais)", () => {
    TestBed.inject(TranslocoService).setActiveLang('en');
    const error = new HttpErrorResponse({ status: 404, error: '<!doctype html>' });

    expect(parseApiError(error, 'Unable to save.').message).toBe(
      'Unable to save. This service is not available on the server: contact the administrator (error 404).',
    );
  });
});
