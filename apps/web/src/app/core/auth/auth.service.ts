import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import type {
  ApiSuccess,
  AuthSession,
  AuthUser,
  LoginRequest,
  Permission,
  RegisterRequest,
} from '@erp/shared';
import { catchError, finalize, map, type Observable, of, share, tap, firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config/app.constants';

const AUTH_URL = `${API_BASE_URL}/auth`;

/**
 * Session state. The access token lives in memory only (not localStorage, safer against XSS);
 * the refresh token is an httpOnly cookie the browser sends to /api/v1/auth/* automatically.
 * On page reload the session is restored with a silent refresh.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _user = signal<AuthUser | null>(null);
  private accessToken: string | null = null;
  private refreshInFlight$: Observable<AuthSession> | null = null;
  private restorePromise: Promise<boolean> | null = null;

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  private readonly permissions = computed(() => new Set(this._user()?.permissions ?? []));

  hasPermission(permission: Permission): boolean {
    return this.permissions().has(permission);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  login(body: LoginRequest): Observable<AuthUser> {
    return this.http
      .post<ApiSuccess<AuthSession>>(`${AUTH_URL}/login`, body, { withCredentials: true })
      .pipe(map((res) => this.setSession(res.data)));
  }

  register(body: RegisterRequest): Observable<AuthUser> {
    return this.http
      .post<ApiSuccess<AuthSession>>(`${AUTH_URL}/register`, body, { withCredentials: true })
      .pipe(map((res) => this.setSession(res.data)));
  }

  /** Silent refresh. Concurrent callers share one request (avoids rotating the token twice). */
  refresh(): Observable<AuthSession> {
    this.refreshInFlight$ ??= this.http
      .post<ApiSuccess<AuthSession>>(`${AUTH_URL}/refresh`, {}, { withCredentials: true })
      .pipe(
        map((res) => res.data),
        tap((session) => this.setSession(session)),
        finalize(() => (this.refreshInFlight$ = null)),
        share(),
      );
    return this.refreshInFlight$;
  }

  /** Used by guards: resolves true when a session exists or could be restored from the cookie. */
  restoreSession(): Promise<boolean> {
    if (this._user()) return Promise.resolve(true);
    if (!this.isBrowser) return Promise.resolve(false);

    this.restorePromise ??= firstValueFrom(
      this.refresh().pipe(
        map(() => true),
        catchError(() => of(false)),
      ),
    ).finally(() => (this.restorePromise = null));
    return this.restorePromise;
  }

  logout(): void {
    this.http
      .post(`${AUTH_URL}/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.endSession());
  }

  /** Called when a refresh fails mid-session (expired or revoked). */
  endSession(returnUrl?: string): void {
    this.clearSession();
    void this.router.navigate(['/auth/login'], returnUrl ? { queryParams: { returnUrl } } : {});
  }

  private setSession(session: AuthSession): AuthUser {
    this.accessToken = session.accessToken;
    this._user.set(session.user);
    return session.user;
  }

  private clearSession(): void {
    this.accessToken = null;
    this._user.set(null);
  }
}
