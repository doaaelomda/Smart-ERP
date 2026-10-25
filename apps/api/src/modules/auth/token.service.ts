import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Types } from 'mongoose';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/app-error.js';
import { RefreshTokenModel } from './refresh-token.model.js';

export interface AccessTokenPayload {
  sub: string; // userId
  tid: string; // tenantId
}

interface ClientInfo {
  userAgent?: string;
  ip?: string;
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

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function refreshExpiryDate(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Creates a new refresh token. Pass `family` when rotating, omit it for a new login. */
export async function issueRefreshToken(
  userId: Types.ObjectId | string,
  tenantId: Types.ObjectId | string,
  client: ClientInfo,
  family: string = randomUUID(),
): Promise<string> {
  const token = randomBytes(48).toString('base64url');
  await RefreshTokenModel.create({
    userId,
    tenantId,
    tokenHash: hashToken(token),
    family,
    expiresAt: refreshExpiryDate(),
    userAgent: client.userAgent?.slice(0, 300),
    ip: client.ip,
  });
  return token;
}

/**
 * Validates and rotates a refresh token (one-time use).
 * Reusing an already-rotated token is treated as theft: the whole family is revoked.
 */
export async function rotateRefreshToken(
  token: string,
  client: ClientInfo,
): Promise<{ userId: string; tenantId: string; refreshToken: string }> {
  const existing = await RefreshTokenModel.findOne({ tokenHash: hashToken(token) });

  if (!existing) throw AppError.unauthorized('Invalid refresh token');

  if (existing.revokedAt) {
    await revokeFamily(existing.family);
    throw AppError.unauthorized('Refresh token reuse detected');
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    throw AppError.unauthorized('Refresh token expired');
  }

  const refreshToken = await issueRefreshToken(existing.userId, existing.tenantId, client, existing.family);
  existing.revokedAt = new Date();
  existing.replacedBy = hashToken(refreshToken);
  await existing.save();

  return { userId: existing.userId.toString(), tenantId: existing.tenantId.toString(), refreshToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await RefreshTokenModel.updateOne(
    { tokenHash: hashToken(token), revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

export async function revokeFamily(family: string): Promise<void> {
  await RefreshTokenModel.updateMany(
    { family, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}
