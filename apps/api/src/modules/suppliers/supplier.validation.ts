import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

export const supplierBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z
    .union([z.literal(''), z.string().trim().toLowerCase().email().max(254)])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  phone: optionalText(30),
  vatNumber: optionalText(30),
  address: optionalText(300),
  notes: optionalText(1000),
  isActive: z.boolean().optional(),
});

export const updateSupplierSchema = supplierBodySchema.partial();

export const supplierIdParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id'),
});

export type CreateSupplierInput = z.infer<typeof supplierBodySchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
