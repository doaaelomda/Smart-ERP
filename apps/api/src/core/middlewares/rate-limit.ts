import { rateLimit } from 'express-rate-limit';
import { ERROR_CODES, type ApiError } from '@erp/shared';
import { isTest } from '../../config/env.js';

const tooMany: ApiError = {
  success: false,
  error: { code: ERROR_CODES.RATE_LIMITED, message: 'Too many attempts, please try again later' },
};

/** Brute-force protection for login/register: 10 requests per minute per IP. */
export const authRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => isTest,
  message: tooMany,
});
