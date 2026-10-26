import { z } from 'zod';

const email = z.string().trim().toLowerCase().email().max(254);

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
