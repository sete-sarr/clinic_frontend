import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Appointment } from '../../appointments/appointment.model';
import { PortalAppointmentPayload } from './portal-appointment.model';

@Injectable({ providedIn: 'root' })
export class PortalAppointmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/appointments/`;

  create(payload: PortalAppointmentPayload): Observable<Appointment> {
    return this.http.post<Appointment>(this.baseUrl, payload);
  }

  cancel(id: number): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.baseUrl}${id}/cancel/`, {});
  }
}
