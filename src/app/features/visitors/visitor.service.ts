import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Visit, VisitPayload } from './visitor.model';

@Injectable({ providedIn: 'root' })
export class VisitorService {
  private readonly http = inject(HttpClient);
  readonly url = `${environment.apiBaseUrl}/visitors/`;
  readonly targetsUrl = `${this.url}targets/`;

  checkIn(payload: VisitPayload): Observable<Visit> {
    return this.http.post<Visit>(this.url, payload);
  }

  // Correction le jour même uniquement (contrôlé par le backend).
  update(id: number, payload: VisitPayload): Observable<Visit> {
    return this.http.patch<Visit>(`${this.url}${id}/`, payload);
  }

  checkOut(id: number): Observable<Visit> {
    return this.http.post<Visit>(`${this.url}${id}/check-out/`, {});
  }

  // Export CSV (administrateur, audité) — mêmes filtres que l'historique affiché.
  exportCsv(params: Record<string, string>): Observable<Blob> {
    return this.http.get(`${this.url}export/`, { params, responseType: 'blob' });
  }
}
