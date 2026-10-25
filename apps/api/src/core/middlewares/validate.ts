import type { Request, RequestHandler } from 'express';
import type { ZodType } from 'zod';

interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validates body/query/params with Zod. Parsed (coerced, stripped) values are stored on
 * `req.validated` because `req.query` is read-only in Express 5.
 * Errors are forwarded to the global error handler (ZodError -> 400 VALIDATION_ERROR).
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    const validated: NonNullable<Request['validated']> = {};
    if (schemas.params) validated.params = schemas.params.parse(req.params);
    if (schemas.query) validated.query = schemas.query.parse(req.query);
    if (schemas.body) {
      validated.body = schemas.body.parse(req.body);
      req.body = validated.body;
    }
    req.validated = validated;
    next();
  };
}

/** Typed accessor for validated input inside controllers. */
export function getValidated<T>(req: Request, part: 'body' | 'query' | 'params'): T {
  return req.validated?.[part] as T;
}
