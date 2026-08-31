import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { StaffCreatePayload, StaffMember, StaffRole, StaffUpdatePayload } from '../../core/models/staff.model';

@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/accounts/staff/`;

  create(payload: StaffCreatePayload): Observable<StaffMember> {
    return this.http.post<StaffMember>(this.baseUrl, payload);
  }

  update(id: number, payload: StaffUpdatePayload): Observable<StaffMember> {
    return this.http.patch<StaffMember>(`${this.baseUrl}${id}/`, payload);
  }

  // Dedicated actions, not DELETE — business/permissions-matrix.md distinguishes "Désactiver"
  // (allowed) from "Supprimer" (forbidden) for this resource; StaffViewSet exposes no DELETE verb.
  deactivate(id: number): Observable<StaffMember> {
    return this.http.post<StaffMember>(`${this.baseUrl}${id}/deactivate/`, {});
  }

  reactivate(id: number): Observable<StaffMember> {
    return this.http.post<StaffMember>(`${this.baseUrl}${id}/reactivate/`, {});
  }

  changeRole(id: number, role: StaffRole): Observable<StaffMember> {
    return this.http.post<StaffMember>(`${this.baseUrl}${id}/role/`, { role });
  }
}
