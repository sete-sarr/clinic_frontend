import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Consultation, ConsultationPayload, ConsultationStatus } from './consultation.model';

@Injectable({ providedIn: 'root' })
export class ConsultationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/consultations/`;

  create(payload: ConsultationPayload): Observable<Consultation> {
    return this.http.post<Consultation>(this.baseUrl, payload);
  }

  update(id: number, payload: ConsultationPayload): Observable<Consultation> {
    return this.http.put<Consultation>(`${this.baseUrl}${id}/`, payload);
  }

  setStatus(id: number, status: ConsultationStatus): Observable<Consultation> {
    return this.http.patch<Consultation>(`${this.baseUrl}${id}/`, { status });
  }
}
