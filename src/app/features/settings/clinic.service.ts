import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Clinic } from '../../core/models/clinic.model';

@Injectable({ providedIn: 'root' })
export class ClinicService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/clinics/`;

  get(id: number): Observable<Clinic> {
    return this.http.get<Clinic>(`${this.baseUrl}${id}/`);
  }

  // HttpClient sets the multipart/form-data boundary itself from a FormData body — never set
  // Content-Type manually here, it would break the boundary and silently corrupt the upload.
  updateSettings(id: number, formData: FormData): Observable<Clinic> {
    return this.http.patch<Clinic>(`${this.baseUrl}${id}/`, formData);
  }
}
