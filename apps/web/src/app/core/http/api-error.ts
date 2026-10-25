import { HttpErrorResponse } from '@angular/common/http';
import type { ApiError } from '@erp/shared';

/** Maps any HTTP error to a translation key under `errors.*`. */
export function errorTranslationKey(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    // 0 = no connection; 502/503/504 = dev proxy can't reach the API (API not running or crashed).
    if (error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504) {
      return 'errors.NETWORK';
    }
    const code = (error.error as Partial<ApiError> | null)?.error?.code;
    if (code) return `errors.${code}`;
  }
  return 'errors.UNKNOWN';
}
