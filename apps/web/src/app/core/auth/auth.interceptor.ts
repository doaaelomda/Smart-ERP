import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/app.constants';
import { AuthService } from './auth.service';

const PUBLIC_AUTH_ENDPOINT = /\/auth\/(login|register|refresh|logout)$/;

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

/**
 * Adds the access token to API calls. On 401 it refreshes once (shared across parallel
 * requests by AuthService) and retries; if the refresh fails the user is sent to login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL) || PUBLIC_AUTH_ENDPOINT.test(req.url)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  return next(withToken(req, auth.getAccessToken())).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        catchError((refreshError: unknown) => {
          auth.endSession(router.url);
          return throwError(() => refreshError);
        }),
        switchMap((session) => next(withToken(req, session.accessToken))),
      );
    }),
  );
};
