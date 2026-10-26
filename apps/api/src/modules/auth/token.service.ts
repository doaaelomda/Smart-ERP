import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/app-error.js';

export interface AccessTokenPayload {
  sub: string; // userId
  tid: string; // tenantId
}

const ISSUER = 'smart-erp';

export function signAccessToken(userId: string, tenantId: string): string {
  const payload: AccessTokenPayload = { sub: userId, tid: tenantId };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL_SECONDS,
    issuer: ISSUER,
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: ISSUER, algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !decoded.sub || typeof decoded['tid'] !== 'string') {
      throw new Error('Malformed token');
    }
    return { sub: decoded.sub, tid: decoded['tid'] };
  } catch {
    throw AppError.unauthorized('Invalid or expired access token');
  }
}
