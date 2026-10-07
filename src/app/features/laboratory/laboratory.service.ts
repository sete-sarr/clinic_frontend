import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LabOrder, LabOrderPayload, LabResultEntry, LabTest, LabTestPayload } from './laboratory.model';

// Transitions de la demande : uniquement par actions (laboratory/api/views.py), jamais en modifiant
// le statut — la machine à états est appliquée par le backend (business/workflow-policy.md).
export type LabOrderTransition = 'collect' | 'start' | 'complete' | 'validate' | 'cancel';

@Injectable({ providedIn: 'root' })
export class LaboratoryService {
  private readonly http = inject(HttpClient);
  readonly testsUrl = `${environment.apiBaseUrl}/laboratory/tests/`;
  readonly ordersUrl = `${environment.apiBaseUrl}/laboratory/orders/`;

  createTest(payload: LabTestPayload): Observable<LabTest> {
    return this.http.post<LabTest>(this.testsUrl, payload);
  }

  updateTest(id: number, payload: LabTestPayload): Observable<LabTest> {
    return this.http.patch<LabTest>(`${this.testsUrl}${id}/`, payload);
  }

  setTestArchived(test: LabTest, archived: boolean): Observable<LabTest> {
    return this.http.post<LabTest>(`${this.testsUrl}${test.id}/${archived ? 'archive' : 'restore'}/`, {});
  }

  createOrder(payload: LabOrderPayload): Observable<LabOrder> {
    return this.http.post<LabOrder>(this.ordersUrl, payload);
  }

  transition(orderId: number, transition: LabOrderTransition): Observable<LabOrder> {
    return this.http.post<LabOrder>(`${this.ordersUrl}${orderId}/${transition}/`, {});
  }

  recordResults(orderId: number, results: LabResultEntry[]): Observable<LabOrder> {
    return this.http.post<LabOrder>(`${this.ordersUrl}${orderId}/results/`, { results });
  }

  attachFile(orderId: number, itemId: number, file: File): Observable<LabOrder> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<LabOrder>(this.attachmentUrl(orderId, itemId), body);
  }

  downloadAttachment(orderId: number, itemId: number): Observable<Blob> {
    return this.http.get(this.attachmentUrl(orderId, itemId), { responseType: 'blob' });
  }

  correctResult(orderId: number, itemId: number, payload: { value: string; comment: string; reason: string }): Observable<LabOrder> {
    return this.http.post<LabOrder>(`${this.ordersUrl}${orderId}/items/${itemId}/correct/`, payload);
  }

  downloadPdf(orderId: number): Observable<Blob> {
    return this.http.get(`${this.ordersUrl}${orderId}/pdf/`, { responseType: 'blob' });
  }

  private attachmentUrl(orderId: number, itemId: number): string {
    return `${this.ordersUrl}${orderId}/items/${itemId}/attachment/`;
  }
}
