import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Department, DepartmentCreatePayload, DepartmentUpdatePayload } from '../../core/models/department.model';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/departments/`;

  create(payload: DepartmentCreatePayload): Observable<Department> {
    return this.http.post<Department>(this.baseUrl, payload);
  }

  update(id: number, payload: DepartmentUpdatePayload): Observable<Department> {
    return this.http.patch<Department>(`${this.baseUrl}${id}/`, payload);
  }

  // Dedicated actions, not DELETE — business/workflow-policy.md forbids physical deletion;
  // DepartmentViewSet exposes no DELETE verb (departments/api/views.py http_method_names).
  archive(id: number): Observable<Department> {
    return this.http.post<Department>(`${this.baseUrl}${id}/archive/`, {});
  }

  restore(id: number): Observable<Department> {
    return this.http.post<Department>(`${this.baseUrl}${id}/restore/`, {});
  }

  deactivate(id: number): Observable<Department> {
    return this.http.post<Department>(`${this.baseUrl}${id}/deactivate/`, {});
  }

  activate(id: number): Observable<Department> {
    return this.http.post<Department>(`${this.baseUrl}${id}/activate/`, {});
  }
}
