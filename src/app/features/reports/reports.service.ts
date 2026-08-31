import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/reports/`;

  // See billing/invoice.service.ts::downloadPdf for why this is a blob fetch rather than a plain <a href>.
  downloadActivityReport(dateFrom: string | null, dateTo: string | null): Observable<Blob> {
    return this.http.get(`${this.baseUrl}activity/`, {
      responseType: 'blob',
      params: {
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
      },
    });
  }
}
