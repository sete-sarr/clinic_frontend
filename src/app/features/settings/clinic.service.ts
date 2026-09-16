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

  // HttpClient définit lui-même la limite (boundary) multipart/form-data à partir d'un corps FormData —
  // ne jamais définir Content-Type manuellement ici, cela casserait la limite et corromprait silencieusement l'upload.
  updateSettings(id: number, formData: FormData): Observable<Clinic> {
    return this.http.patch<Clinic>(`${this.baseUrl}${id}/`, formData);
  }
}
