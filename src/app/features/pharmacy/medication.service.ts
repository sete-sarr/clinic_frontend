import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Medication,
  MedicationCreatePayload,
  MedicationUpdatePayload,
  StockBatch,
  StockBatchCreatePayload,
} from '../../core/models/pharmacy.model';

@Injectable({ providedIn: 'root' })
export class MedicationService {
  private readonly http = inject(HttpClient);
  private readonly medicationsUrl = `${environment.apiBaseUrl}/pharmacy/medications/`;
  private readonly batchesUrl = `${environment.apiBaseUrl}/pharmacy/batches/`;

  create(payload: MedicationCreatePayload): Observable<Medication> {
    return this.http.post<Medication>(this.medicationsUrl, payload);
  }

  update(id: number, payload: MedicationUpdatePayload): Observable<Medication> {
    return this.http.patch<Medication>(`${this.medicationsUrl}${id}/`, payload);
  }

  // Pas de DELETE — business/validation-rules.md interdit la suppression physique ;
  // MedicationViewSet n'expose que archive/restore (pharmacy/api/views.py http_method_names).
  archive(id: number): Observable<Medication> {
    return this.http.post<Medication>(`${this.medicationsUrl}${id}/archive/`, {});
  }

  restore(id: number): Observable<Medication> {
    return this.http.post<Medication>(`${this.medicationsUrl}${id}/restore/`, {});
  }

  receiveBatch(payload: StockBatchCreatePayload): Observable<StockBatch> {
    return this.http.post<StockBatch>(this.batchesUrl, payload);
  }
}
