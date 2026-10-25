import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParamsSchema = z.object({ id: objectIdSchema });
export type IdParams = z.infer<typeof idParamsSchema>;

/** Optional trimmed text; empty string becomes undefined. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

/** Positive quantity with at most 3 decimals (e.g. 1.5 kg). */
export const quantitySchema = z
  .number()
  .positive()
  .max(1_000_000)
  .refine((q) => Math.abs(q * 1000 - Math.round(q * 1000)) < 1e-6, { message: 'At most 3 decimal places' });

/** Integer minor units. */
export const moneySchema = z.number().int().min(0).max(1e12);
