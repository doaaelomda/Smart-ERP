import { z } from 'zod';
import { LANGUAGES, PASSWORD_PATTERN } from '@erp/shared';

const email = z.string().trim().toLowerCase().email().max(254);

export const registerSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(80),
  email,
  password: z
    .string()
    .regex(PASSWORD_PATTERN, 'Password must be 8-128 characters and include letters and numbers'),
  language: z.enum(LANGUAGES).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
