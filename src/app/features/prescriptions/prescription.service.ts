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

  // Le endpoint PDF nécessite le token Bearer (docs/reporting-guidelines.md : chaque document doit
  // vérifier l'accès), il ne peut donc pas être ouvert comme un simple <a href> — récupéré à la place
  // en tant que blob via HttpClient (et donc via l'intercepteur d'authentification).
  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}${id}/pdf/`, { responseType: 'blob' });
  }
}
