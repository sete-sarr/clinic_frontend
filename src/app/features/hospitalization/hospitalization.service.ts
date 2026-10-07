import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Admission,
  AdmissionPayload,
  Bed,
  NursingNote,
  Room,
  RoomType,
  VitalSign,
  VitalSignPayload,
} from './hospitalization.model';

// Séjours et lits : transitions uniquement par actions (hospitalization/api/views.py), la machine à
// états étant appliquée par le backend (business/workflow-policy.md § SÉJOUR, LIT).
export type BedTransition = 'clean' | 'out-of-service' | 'back-in-service' | 'archive' | 'restore';
export type StructureKind = 'room-types' | 'rooms' | 'beds';

@Injectable({ providedIn: 'root' })
export class HospitalizationService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = `${environment.apiBaseUrl}/hospitalization/`;
  readonly admissionsUrl = `${this.baseUrl}admissions/`;
  readonly boardUrl = `${this.baseUrl}beds/board/`;

  structureUrl(kind: StructureKind): string {
    return `${this.baseUrl}${kind}/`;
  }

  saveStructure<T extends RoomType | Room | Bed>(kind: StructureKind, payload: object, id?: number): Observable<T> {
    const url = this.structureUrl(kind);
    return id ? this.http.patch<T>(`${url}${id}/`, payload) : this.http.post<T>(url, payload);
  }

  setStructureActive<T>(kind: StructureKind, id: number, active: boolean): Observable<T> {
    return this.http.post<T>(`${this.structureUrl(kind)}${id}/${active ? 'restore' : 'archive'}/`, {});
  }

  bedTransition(bedId: number, transition: BedTransition): Observable<Bed> {
    return this.http.post<Bed>(`${this.structureUrl('beds')}${bedId}/${transition}/`, {});
  }

  createAdmission(payload: AdmissionPayload): Observable<Admission> {
    return this.http.post<Admission>(this.admissionsUrl, payload);
  }

  admit(id: number, bed: number): Observable<Admission> {
    return this.http.post<Admission>(`${this.admissionsUrl}${id}/admit/`, { bed });
  }

  transfer(id: number, bed: number, reason: string): Observable<Admission> {
    return this.http.post<Admission>(`${this.admissionsUrl}${id}/transfer/`, { bed, reason });
  }

  discharge(id: number, summary: string): Observable<Admission> {
    return this.http.post<Admission>(`${this.admissionsUrl}${id}/discharge/`, { summary });
  }

  cancel(id: number): Observable<Admission> {
    return this.http.post<Admission>(`${this.admissionsUrl}${id}/cancel/`, {});
  }

  recordVitals(id: number, payload: VitalSignPayload): Observable<VitalSign> {
    return this.http.post<VitalSign>(`${this.admissionsUrl}${id}/vitals/`, payload);
  }

  addNote(id: number, note: string): Observable<NursingNote> {
    return this.http.post<NursingNote>(`${this.admissionsUrl}${id}/notes/`, { note });
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.admissionsUrl}${id}/pdf/`, { responseType: 'blob' });
  }
}
