import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ClinicSummary {
  id: number;
  name: string;
}

export interface ActivationIdentity {
  clinic: number;
  patient_number: string;
  phone: string;
  date_of_birth: string;
}

export interface ActivationVerifyPayload extends ActivationIdentity {
  code: string;
  username: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class ActivationService {
  private readonly http = inject(HttpClient);

  requestActivation(payload: ActivationIdentity): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiBaseUrl}/accounts/patient/activation/request/`,
      payload,
    );
  }

  verifyActivation(payload: ActivationVerifyPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiBaseUrl}/accounts/patient/activation/verify/`,
      payload,
    );
  }
}
