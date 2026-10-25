import type { Response } from 'express';
import type { ApiSuccess, PaginationMeta } from '@erp/shared';

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const body: ApiSuccess<T> = { success: true, data };
  res.status(status).json(body);
}

export function sendPaginated<T>(res: Response, data: T[], meta: PaginationMeta): void {
  const body: ApiSuccess<T[]> = { success: true, data, meta };
  res.status(200).json(body);
}
