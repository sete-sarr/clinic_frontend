import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Appointment, AppointmentPayload, AppointmentStatus } from './appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/appointments/`;

  create(payload: AppointmentPayload): Observable<Appointment> {
    return this.http.post<Appointment>(this.baseUrl, payload);
  }

  update(id: number, payload: AppointmentPayload): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.baseUrl}${id}/`, payload);
  }

  setStatus(id: number, status: AppointmentStatus): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.baseUrl}${id}/`, { status });
  }

  checkIn(id: number): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.baseUrl}${id}/check-in/`, {});
  }

  downloadTicketPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}${id}/ticket-pdf/`, { responseType: 'blob' });
  }

  exportCsv(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}export/`, { responseType: 'blob' });
  }
}
