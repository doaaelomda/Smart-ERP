import bcrypt from 'bcryptjs';
import {
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_ROLES,
  ERROR_CODES,
  OWNER_ROLE,
  type AuthSession,
  type AuthUser,
  type Language,
  type Permission,
} from '@erp/shared';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../core/errors/app-error.js';
import { withTransaction } from '../../core/utils/transaction.js';
import { RoleModel } from '../roles/role.model.js';
import { TenantModel } from '../tenants/tenant.model.js';
import { notify } from '../notifications/notification.service.js';
import { UserModel } from '../users/user.model.js';
import { createDefaultWarehouse } from '../warehouses/warehouse.service.js';
import type { LoginInput } from './auth.validation.js';
import { signAccessToken } from './token.service.js';

// Used to keep login timing similar whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', 4);

/** Builds the user object the frontend needs (role, permissions, tenant settings). */
export async function buildAuthUser(userId: string): Promise<AuthUser> {
  const user = await UserModel.findById(userId).setOptions({ skipTenant: true }).lean();
  if (!user) throw AppError.unauthorized('User not found');

  const [role, tenant] = await Promise.all([
    RoleModel.findById(user.roleId).setOptions({ skipTenant: true }).lean(),
    TenantModel.findById(user.tenantId).lean(),
  ]);
  if (!role || !tenant) throw AppError.unauthorized('Account is not configured correctly');

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    language: user.language as Language,
    role: { id: role._id.toString(), name: role.name },
    permissions: role.permissions as Permission[],
    tenant: {
      id: tenant._id.toString(),
      name: tenant.name,
      currency: tenant.currency,
      vatRate: tenant.vatRate,
    },
  };
}

async function createSession(userId: string, tenantId: string): Promise<AuthSession> {
  return {
    accessToken: signAccessToken(userId, tenantId),
    expiresIn: env.JWT_ACCESS_TTL_SECONDS,
    user: await buildAuthUser(userId),
  };
}

export interface AdminInput {
  companyName: string;
  name: string;
  email: string;
  /** Plain password (hashed here) or an already hashed one. */
  password?: string;
  passwordHash?: string;
  language?: Language;
}

/** Creates the company, its two roles (SuperAdmin, Accountant) and the one SuperAdmin user. */
export async function createAdmin(input: AdminInput): Promise<void> {
  const passwordHash = input.passwordHash ?? (await bcrypt.hash(input.password ?? '', env.BCRYPT_ROUNDS));
  const language: Language = input.language ?? 'ar';

  const { userId, tenantId } = await withTransaction(async (session) => {
    const [tenant] = await TenantModel.create([{ name: input.companyName, defaultLanguage: language }], { session });
    const tenantId = tenant!._id;

    const roles = await RoleModel.insertMany(
      DEFAULT_ROLES.map((name) => ({ tenantId, name, permissions: DEFAULT_ROLE_PERMISSIONS[name], isSystem: true })),
      { session },
    );
    const adminRole = roles.find((r) => r.name === OWNER_ROLE)!;

    const [user] = await UserModel.create(
      [{ tenantId, name: input.name, email: input.email.toLowerCase(), passwordHash, roleId: adminRole._id, language }],
      { session },
    );

    await createDefaultWarehouse(tenantId.toString(), language === 'ar' ? 'المستودع الرئيسي' : 'Main warehouse', session);

    return { userId: user!._id.toString(), tenantId: tenantId.toString() };
  });

  // Best effort: a failed welcome message must not fail the setup.
  await notify({ tenantId, userIds: [userId], type: 'system', messageKey: 'notifications.welcome', link: '/app/customers' }).catch(
    (err: unknown) => logger.warn({ err }, 'Welcome notification failed'),
  );
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const user = await UserModel.findOne({ email: input.email })
    .setOptions({ skipTenant: true })
    .select('+passwordHash');

  const passwordOk = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    throw new AppError(401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
  }

  await assertCanSignIn(user.isActive, user.tenantId.toString());

  user.lastLoginAt = new Date();
  await user.save();

  return createSession(user._id.toString(), user.tenantId.toString());
}

export async function assertCanSignIn(isActive: boolean | null | undefined, tenantId: string): Promise<void> {
  if (!isActive) throw new AppError(403, ERROR_CODES.ACCOUNT_DISABLED, 'This account is disabled');
  const tenant = await TenantModel.findById(tenantId).select('status').lean();
  if (!tenant || tenant.status !== 'active') {
    throw new AppError(403, ERROR_CODES.TENANT_SUSPENDED, 'This company account is suspended');
  }
}
