import type { RequestHandler } from 'express';
import type { Permission } from '@erp/shared';
import { RoleModel } from '../../modules/roles/role.model.js';
import { assertCanSignIn } from '../../modules/auth/auth.service.js';
import { verifyAccessToken } from '../../modules/auth/token.service.js';
import { UserModel } from '../../modules/users/user.model.js';
import { runWithContext } from '../context/request-context.js';
import { AppError } from '../errors/app-error.js';

/**
 * Verifies the Bearer access token, loads the user's current role/permissions
 * (so disabling a user or changing a role applies immediately), and runs the rest
 * of the request inside the tenant context used by the tenant plugin.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.get('authorization');
  if (!header?.startsWith('Bearer ')) throw AppError.unauthorized();

  const payload = verifyAccessToken(header.slice(7));

  const user = await UserModel.findOne({ _id: payload.sub, tenantId: payload.tid })
    .setOptions({ skipTenant: true })
    .select('isActive roleId tenantId')
    .lean();
  if (!user) throw AppError.unauthorized('User not found');
  await assertCanSignIn(user.isActive, payload.tid);

  const role = await RoleModel.findById(user.roleId).setOptions({ skipTenant: true }).select('permissions').lean();

  req.auth = {
    userId: payload.sub,
    tenantId: payload.tid,
    roleId: user.roleId.toString(),
    permissions: new Set((role?.permissions ?? []) as Permission[]),
  };

  runWithContext({ tenantId: payload.tid, userId: payload.sub }, () => next());
};
