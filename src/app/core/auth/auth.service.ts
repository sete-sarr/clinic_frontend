import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthTokens,
  ClinicRegistration,
  LoginCredentials,
  LoginResponse,
  Role,
  User,
} from '../models/user.model';

const ACCESS_TOKEN_KEY = 'clinic_access_token';
const REFRESH_TOKEN_KEY = 'clinic_refresh_token';
const USER_KEY = 'clinic_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly accessToken = signal<string | null>(this.readStorage(ACCESS_TOKEN_KEY));
  private readonly refreshTokenValue = signal<string | null>(this.readStorage(REFRESH_TOKEN_KEY));
  readonly user = signal<User | null>(this.readUserStorage());

  readonly isAuthenticated = computed(() => this.accessToken() !== null);
  readonly roles = computed<Role[]>(() => this.user()?.roles ?? []);

  hasRole(...allowed: Role[]): boolean {
    const roles = this.roles();
    return allowed.some((role) => roles.includes(role));
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  hasRefreshToken(): boolean {
    return this.refreshTokenValue() !== null;
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/auth/token/`, credentials)
      .pipe(tap((response) => this.setSession(response)));
  }

  registerClinic(registration: ClinicRegistration): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/accounts/clinics/register/`, registration)
      .pipe(tap((response) => this.setSession(response)));
  }

  refreshAccessToken(): Observable<AuthTokens> {
    const refresh = this.refreshTokenValue();
    return this.http
      .post<AuthTokens>(`${environment.apiBaseUrl}/auth/token/refresh/`, { refresh })
      .pipe(tap((tokens) => this.setAccessToken(tokens.access)));
  }

  logout(): void {
    // Best-effort server-side revocation (blacklists the refresh token, records the LOGOUT audit
    // event — business/access-policy.md "AUDIT POLICY"). Fired before clearing local state so the
    // auth interceptor still has a token to attach; local state is cleared unconditionally right
    // after so the UI/guards behave correctly even if this call fails or is still in flight.
    const refresh = this.refreshTokenValue();
    if (this.accessToken() && refresh) {
      this.http.post(`${environment.apiBaseUrl}/auth/logout/`, { refresh }).subscribe({ error: () => undefined });
    }
    this.accessToken.set(null);
    this.refreshTokenValue.set(null);
    this.user.set(null);
    this.clearStorage();
  }

  private setSession(response: LoginResponse): void {
    this.accessToken.set(response.access);
    this.refreshTokenValue.set(response.refresh);
    this.user.set(response.user);
    if (this.isBrowser) {
      localStorage.setItem(ACCESS_TOKEN_KEY, response.access);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    }
  }

  private setAccessToken(access: string): void {
    this.accessToken.set(access);
    if (this.isBrowser) {
      localStorage.setItem(ACCESS_TOKEN_KEY, access);
    }
  }

  private readStorage(key: string): string | null {
    return this.isBrowser ? localStorage.getItem(key) : null;
  }

  private readUserStorage(): User | null {
    const raw = this.readStorage(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }

  private clearStorage(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
