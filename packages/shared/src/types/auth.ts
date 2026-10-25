import type { Language } from '../constants/languages.js';
import type { Permission } from '../constants/permissions.js';

export interface AuthTenant {
  id: string;
  name: string;
  currency: string;
  vatRate: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  language: Language;
  role: { id: string; name: string };
  permissions: Permission[];
  tenant: AuthTenant;
}

/** Returned by register, login and refresh. The refresh token travels in an httpOnly cookie. */
export interface AuthSession {
  accessToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  user: AuthUser;
}

export interface RegisterRequest {
  companyName: string;
  name: string;
  email: string;
  password: string;
  language?: Language;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Shared password rule: at least 8 chars with at least one letter and one number. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;
