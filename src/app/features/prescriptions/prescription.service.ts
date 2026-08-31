import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Prescription, PrescriptionPayload, PrescriptionStatus } from './prescription.model';

@Injectable({ providedIn: 'root' })
export class PrescriptionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/prescriptions/`;

  create(payload: PrescriptionPayload): Observable<Prescription> {
    return this.http.post<Prescription>(this.baseUrl, payload);
  }

  update(id: number, payload: PrescriptionPayload): Observable<Prescription> {
    return this.http.put<Prescription>(`${this.baseUrl}${id}/`, payload);
  }

  setStatus(id: number, status: PrescriptionStatus): Observable<Prescription> {
    return this.http.patch<Prescription>(`${this.baseUrl}${id}/`, { status });
  }

  // The PDF endpoint requires the Bearer token (docs/reporting-guidelines.md: every document must
  // check access), so it can't be opened as a plain <a href> — fetched as a blob through HttpClient
  // (and therefore through the auth interceptor) instead.
  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}${id}/pdf/`, { responseType: 'blob' });
  }
}
