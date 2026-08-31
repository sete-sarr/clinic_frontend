import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Payment, PaymentPayload } from './payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/payments/`;

  create(payload: PaymentPayload): Observable<Payment> {
    return this.http.post<Payment>(this.baseUrl, payload);
  }

  refund(id: number): Observable<Payment> {
    return this.http.post<Payment>(`${this.baseUrl}${id}/refund/`, {});
  }

  // See billing/invoice.service.ts::downloadPdf for why this is a blob fetch rather than a plain <a href>.
  downloadReceiptPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}${id}/pdf/`, { responseType: 'blob' });
  }

  exportCsv(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}export/`, { responseType: 'blob' });
  }
}
