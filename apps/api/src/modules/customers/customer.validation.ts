import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

export const customerBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z
    .union([z.literal(''), z.string().trim().toLowerCase().email().max(254)])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  phone: optionalText(30),
  vatNumber: optionalText(30),
  address: optionalText(300),
  /** Minor units. */
  creditLimit: z.number().int().min(0).max(1e13).optional(),
  notes: optionalText(1000),
  isActive: z.boolean().optional(),
});

export const updateCustomerSchema = customerBodySchema.partial();

export const customerIdParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id'),
});

export type CreateCustomerInput = z.infer<typeof customerBodySchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
