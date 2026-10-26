import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/app.constants';
import { AuthService } from './auth.service';

/** Adds the token to API calls. A 401 on any other call means the token expired: go back to login. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getAccessToken();
  const isLogin = req.url.endsWith('/auth/login');

  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isLogin) {
        auth.endSession(router.url);
      }
      return throwError(() => error);
    }),
  );
};
