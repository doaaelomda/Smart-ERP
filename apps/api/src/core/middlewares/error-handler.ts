import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { ERROR_CODES, type ApiError } from '@erp/shared';
import { isProd } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../errors/app-error.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof ZodError) {
    return AppError.badRequest(
      'Validation failed',
      err.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message })),
    );
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return AppError.badRequest(
      'Validation failed',
      Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    );
  }

  if (err instanceof mongoose.Error.CastError) {
    return AppError.badRequest(`Invalid value for ${err.path}`);
  }

  // Duplicate key (unique index)
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    const keys = Object.keys((err as { keyValue?: object }).keyValue ?? {});
    return AppError.conflict(`Duplicate value for ${keys.join(', ') || 'unique field'}`);
  }

  // Malformed JSON body (express.json)
  if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed') {
    return AppError.badRequest('Malformed JSON body');
  }

  return new AppError(500, ERROR_CODES.INTERNAL_ERROR, 'Something went wrong');
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const appError = toAppError(err);

  if (appError.statusCode >= 500) {
    logger.error({ err, path: req.originalUrl }, 'Unhandled error');
  }

  const body: ApiError = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
  };

  if (!isProd && appError.statusCode >= 500 && err instanceof Error) {
    (body.error as Record<string, unknown>)['stack'] = err.stack;
  }

  res.status(appError.statusCode).json(body);
};
