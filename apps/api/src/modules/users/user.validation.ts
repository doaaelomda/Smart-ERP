import { z } from 'zod';
import { LANGUAGES, PASSWORD_PATTERN } from '@erp/shared';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const password = z.string().regex(PASSWORD_PATTERN, 'Password must be 8-128 characters and include letters and numbers');

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password,
  roleId: objectId,
  language: z.enum(LANGUAGES).optional(),
});

/** Every field is optional; `password` resets the user's password. */
export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  roleId: objectId.optional(),
  isActive: z.boolean().optional(),
  password: password.optional(),
});

export const userIdParamsSchema = z.object({ id: objectId });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
