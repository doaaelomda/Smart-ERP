import { HttpParams } from '@angular/common/http';
import type { ApiSuccess, PaginationMeta } from '@erp/shared';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/** Drops empty values so the API only receives filters that are set. */
export function toHttpParams(query: QueryParams): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
  }
  return params;
}

export interface Page<T> {
  items: T[];
  meta: PaginationMeta;
}

export function toPage<T>(res: ApiSuccess<T[]>): Page<T> {
  return { items: res.data, meta: res.meta! };
}
