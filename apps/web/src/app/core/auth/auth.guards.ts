import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import type { Permission } from '@erp/shared';
import { AuthService } from './auth.service';

/** Protects /app: restores the session from the saved token or redirects to login. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (await auth.restoreSession()) return true;
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps signed-in users away from login. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await auth.restoreSession()) ? router.createUrlTree(['/app/dashboard']) : true;
};

/** Route-level permission check: `data: { permission: 'invoices.view' }`. */
export const permissionGuard: CanActivateFn = (route) => {
  const permission = route.data['permission'] as Permission | undefined;
  if (!permission || inject(AuthService).hasPermission(permission)) return true;
  return inject(Router).createUrlTree(['/app/dashboard']);
};

/** Only allow internal app URLs as post-login redirects (prevents open redirects). */
export function safeReturnUrl(url: string | null | undefined): string {
  return url && url.startsWith('/app') && !url.startsWith('//') ? url : '/app/dashboard';
}
