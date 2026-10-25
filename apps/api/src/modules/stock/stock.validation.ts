import { z } from 'zod';
import { objectIdSchema, optionalText, quantitySchema } from '../../core/utils/validation.js';

export const adjustmentSchema = z.object({
  productId: objectIdSchema,
  warehouseId: objectIdSchema,
  /** Signed change, non-zero. */
  quantity: z
    .number()
    .refine((q) => q !== 0, { message: 'Quantity cannot be zero' })
    .refine((q) => Math.abs(q) <= 1_000_000 && Math.abs(q * 1000 - Math.round(q * 1000)) < 1e-6, {
      message: 'Invalid quantity',
    }),
  reason: z.string().trim().min(3).max(300),
});

export const transferSchema = z
  .object({
    productId: objectIdSchema,
    fromWarehouseId: objectIdSchema,
    toWarehouseId: objectIdSchema,
    quantity: quantitySchema,
    reason: optionalText(300),
  })
  .refine((t) => t.fromWarehouseId !== t.toWarehouseId, {
    message: 'Choose two different warehouses',
    path: ['toWarehouseId'],
  });

export type AdjustmentBody = z.infer<typeof adjustmentSchema>;
export type TransferBody = z.infer<typeof transferSchema>;
