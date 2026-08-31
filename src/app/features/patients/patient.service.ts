import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Patient, PatientPayload } from './patient.model';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/patients/`;

  create(payload: PatientPayload): Observable<Patient> {
    return this.http.post<Patient>(this.baseUrl, payload);
  }

  update(id: number, payload: PatientPayload): Observable<Patient> {
    return this.http.put<Patient>(`${this.baseUrl}${id}/`, payload);
  }

  // Soft delete — backend TenantScopedModelViewSet.perform_destroy sets is_active=False,
  // never a physical delete (business/permissions-matrix.md).
  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }

  // See billing/invoice.service.ts::downloadPdf for why this is a blob fetch rather than a plain <a href>.
  downloadStatementPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}${id}/statement-pdf/`, { responseType: 'blob' });
  }

  exportCsv(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}export/`, { responseType: 'blob' });
  }
}
