import type { RequestHandler } from 'express';
import type { Permission } from '@erp/shared';
import { AppError } from '../errors/app-error.js';

/** Use after `authenticate`: allows the request when the user has ANY of the given permissions. */
export function requirePermission(...permissions: Permission[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) throw AppError.unauthorized();
    if (!permissions.some((p) => req.auth!.permissions.has(p))) throw AppError.forbidden();
    next();
  };
}
