import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import type { ApiSuccess, AuthSession, AuthUser, LoginRequest, Permission } from '@erp/shared';
import { catchError, firstValueFrom, map, type Observable, of } from 'rxjs';
import { API_BASE_URL } from '../config/app.constants';

const AUTH_URL = `${API_BASE_URL}/auth`;
const TOKEN_KEY = 'erp_token';

/**
 * Session state. The login token is kept in localStorage; after a page reload
 * the user is loaded again with GET /auth/me.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _user = signal<AuthUser | null>(null);
  private readonly permissions = computed(() => new Set(this._user()?.permissions ?? []));

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  hasPermission(permission: Permission): boolean {
    return this.permissions().has(permission);
  }

  getAccessToken(): string | null {
    return this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null;
  }

  login(body: LoginRequest): Observable<AuthUser> {
    return this.http.post<ApiSuccess<AuthSession>>(`${AUTH_URL}/login`, body).pipe(
      map((res) => {
        localStorage.setItem(TOKEN_KEY, res.data.accessToken);
        this._user.set(res.data.user);
        return res.data.user;
      }),
    );
  }

  /** Used by guards: true when already signed in, or when the saved token is still valid. */
  async restoreSession(): Promise<boolean> {
    if (this._user()) return true;
    if (!this.getAccessToken()) return false;

    return firstValueFrom(
      this.http.get<ApiSuccess<AuthUser>>(`${AUTH_URL}/me`).pipe(
        map((res) => {
          this._user.set(res.data);
          return true;
        }),
        catchError(() => {
          this.clearSession();
          return of(false);
        }),
      ),
    );
  }

  logout(): void {
    this.endSession();
  }

  /** Clears the session and goes to the login page (also used when the API answers 401). */
  endSession(returnUrl?: string): void {
    this.clearSession();
    void this.router.navigate(['/auth/login'], returnUrl ? { queryParams: { returnUrl } } : {});
  }

  private clearSession(): void {
    if (this.isBrowser) localStorage.removeItem(TOKEN_KEY);
    this._user.set(null);
  }
}
