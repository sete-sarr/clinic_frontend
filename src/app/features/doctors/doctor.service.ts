import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Doctor, DoctorCreatePayload, DoctorUpdatePayload } from '../../core/models/doctor.model';

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/doctors/`;

  create(payload: DoctorCreatePayload): Observable<Doctor> {
    return this.http.post<Doctor>(this.baseUrl, payload);
  }

  update(id: number, payload: DoctorUpdatePayload): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.baseUrl}${id}/`, payload);
  }

  // Soft delete — DoctorViewSet inherits TenantScopedModelViewSet.perform_destroy, which sets
  // is_active=False on DELETE, never a physical delete (business/permissions-matrix.md).
  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }
}
