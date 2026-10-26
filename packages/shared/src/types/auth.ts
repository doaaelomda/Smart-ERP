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

/** Returned by login. */
export interface AuthSession {
  accessToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** A user as listed on the Users screen (never includes the password). */
export interface ManagedUser {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  language: Language;
  lastLoginAt?: string;
  createdAt: string;
  role: { id: string; name: string } | null;
}

export interface RoleOption {
  _id: string;
  name: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  roleId: string;
}

/** `password` resets the password; every field is optional. */
export interface UpdateUserInput {
  name?: string;
  roleId?: string;
  isActive?: boolean;
  password?: string;
}

/** Shared password rule: at least 8 chars with at least one letter and one number. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;
