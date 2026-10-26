import bcrypt from 'bcryptjs';
import { ERROR_CODES, type Language } from '@erp/shared';
import { env } from '../../config/env.js';
import { getRequestContext } from '../../core/context/request-context.js';
import { AppError } from '../../core/errors/app-error.js';
import { buildPaginationMeta, parseListQuery } from '../../core/utils/list-query.js';
import { RoleModel } from '../roles/role.model.js';
import { UserModel } from './user.model.js';
import type { CreateUserInput, UpdateUserInput } from './user.validation.js';

const LIST_OPTIONS = {
  sortable: ['name', 'email', 'createdAt', 'lastLoginAt'],
  searchable: ['name', 'email'],
  filterable: ['isActive'],
  defaultSort: '-createdAt',
} as const;

/** Users are shown with their role name; the password hash is never selected. */
function withRole<T extends { roleId: unknown }>(user: T, roles: { _id: unknown; name: string }[]) {
  const role = roles.find((r) => String(r._id) === String(user.roleId));
  return { ...user, role: role ? { id: String(role._id), name: role.name } : null };
}

export async function listRoles() {
  return RoleModel.find().select('name').sort({ name: 1 }).lean();
}

export async function listUsers(rawQuery: Record<string, unknown>) {
  const { filter, sort, skip, limit, page } = parseListQuery(rawQuery, LIST_OPTIONS);
  if (typeof filter['isActive'] === 'string') filter['isActive'] = filter['isActive'] === 'true';

  const [users, total, roles] = await Promise.all([
    UserModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    UserModel.countDocuments(filter),
    listRoles(),
  ]);
  return { items: users.map((u) => withRole(u, roles)), meta: buildPaginationMeta(total, page, limit) };
}

async function assertRoleExists(roleId: string) {
  if (!(await RoleModel.exists({ _id: roleId }))) {
    throw AppError.badRequest('Role not found', [{ path: 'roleId', message: 'Invalid role' }]);
  }
}

export async function createUser(input: CreateUserInput) {
  await assertRoleExists(input.roleId);
  if (await UserModel.exists({ email: input.email }).setOptions({ skipTenant: true })) {
    throw AppError.conflict('Email is already registered', ERROR_CODES.EMAIL_TAKEN);
  }

  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, env.BCRYPT_ROUNDS),
    roleId: input.roleId,
    language: (input.language ?? 'ar') as Language,
  });
  return withRole(user.toJSON(), await listRoles());
}

export async function updateUser(id: string, input: UpdateUserInput) {
  if (id === getRequestContext()?.userId && (input.isActive === false || input.roleId)) {
    throw AppError.badRequest('You cannot disable or change the role of your own account');
  }
  if (input.roleId) await assertRoleExists(input.roleId);

  const { password, ...rest } = input;
  const changes: Record<string, unknown> = { ...rest };
  if (password) changes['passwordHash'] = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  const user = await UserModel.findOneAndUpdate({ _id: id }, { $set: changes }, { returnDocument: 'after' }).lean();
  if (!user) throw AppError.notFound('User not found');
  return withRole(user, await listRoles());
}

export async function deleteUser(id: string) {
  if (id === getRequestContext()?.userId) throw AppError.badRequest('You cannot delete your own account');
  const result = await UserModel.deleteOne({ _id: id });
  if (result.deletedCount === 0) throw AppError.notFound('User not found');
}
