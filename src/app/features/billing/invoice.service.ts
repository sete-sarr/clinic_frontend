import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Invoice, InvoicePayload } from './invoice.model';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/billing/`;

  create(payload: InvoicePayload): Observable<Invoice> {
    return this.http.post<Invoice>(this.baseUrl, payload);
  }

  update(id: number, payload: InvoicePayload): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.baseUrl}${id}/`, payload);
  }

  issue(id: number): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.baseUrl}${id}/issue/`, {});
  }

  cancel(id: number): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.baseUrl}${id}/cancel/`, {});
  }

  // See prescription.service.ts for why this is a blob fetch rather than a plain <a href>.
  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}${id}/pdf/`, { responseType: 'blob' });
  }

  exportCsv(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}export/`, { responseType: 'blob' });
  }
}
