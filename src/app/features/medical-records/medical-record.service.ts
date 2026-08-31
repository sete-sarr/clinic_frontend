import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { MedicalRecord, MedicalRecordPayload } from './medical-record.model';

@Injectable({ providedIn: 'root' })
export class MedicalRecordService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/medical-records/`;

  update(id: number, payload: MedicalRecordPayload): Observable<MedicalRecord> {
    return this.http.put<MedicalRecord>(`${this.baseUrl}${id}/`, payload);
  }
}
