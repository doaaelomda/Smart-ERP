import { readFileSync } from 'node:fs';
import bcrypt from 'bcryptjs';
import { OWNER_ROLE } from '@erp/shared';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { RoleModel } from '../roles/role.model.js';
import { TenantModel } from '../tenants/tenant.model.js';
import { UserModel } from '../users/user.model.js';
import { createAdmin } from './auth.service.js';

/** Local file (never committed): apps/api/super-admins.json, found from both src/ (dev) and dist/ (production). */
const FILE = new URL('../../../super-admins.json', import.meta.url);

const fileSchema = z.array(
  z.object({
    name: z.string().min(2),
    email: z.string().email().transform((v) => v.toLowerCase()),
    password: z.string().min(8),
  }),
);

/** The list comes from the SUPER_ADMINS env var (JSON, used on the live server) or else from the local file. */
function readAdmins(): unknown {
  const fromEnv = process.env['SUPER_ADMINS'];
  return JSON.parse(fromEnv && fromEnv.trim() ? fromEnv : readFileSync(FILE, 'utf8'));
}

/**
 * On every start: creates the SuperAdmins in the list that do not exist yet.
 * To add one, add an entry to SUPER_ADMINS (or the local file) and restart. Existing users are never changed.
 */
export async function syncSuperAdmins(): Promise<void> {
  let admins: z.infer<typeof fileSchema>;
  try {
    admins = fileSchema.parse(readAdmins());
  } catch (err) {
    logger.warn({ err }, 'No valid SuperAdmins list (SUPER_ADMINS env or super-admins.json), skipping');
    return;
  }

  for (const admin of admins) {
    if (await UserModel.exists({ email: admin.email }).setOptions({ skipTenant: true })) continue;

    const tenant = await TenantModel.findOne().sort({ createdAt: 1 }).lean();
    if (!tenant) {
      await createAdmin({ companyName: 'Smart ERP', name: admin.name, email: admin.email, password: admin.password });
    } else {
      const role = await RoleModel.findOne({ tenantId: tenant._id, name: OWNER_ROLE }).setOptions({ skipTenant: true }).lean();
      if (!role) continue;
      await UserModel.create({ tenantId: tenant._id, name: admin.name, email: admin.email, passwordHash: await bcrypt.hash(admin.password, env.BCRYPT_ROUNDS), roleId: role._id });
    }
    logger.info({ email: admin.email }, 'SuperAdmin created');
  }
}
