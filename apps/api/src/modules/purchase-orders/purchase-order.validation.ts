import { z } from 'zod';
import { objectIdSchema, optionalText, quantitySchema } from '../../core/utils/validation.js';
import { documentLinesSchema } from '../documents/document-lines.js';

export const purchaseOrderBodySchema = z.object({
  supplierId: objectIdSchema,
  warehouseId: objectIdSchema,
  orderDate: z.coerce.date().optional(),
  expectedDate: z.coerce.date().optional(),
  lines: documentLinesSchema,
  notes: optionalText(1000),
});

export const updatePurchaseOrderSchema = purchaseOrderBodySchema.partial();

export const receivePurchaseOrderSchema = z.object({
  lines: z
    .array(z.object({ index: z.number().int().min(0), quantity: quantitySchema }))
    .min(1)
    .refine((lines) => new Set(lines.map((l) => l.index)).size === lines.length, { message: 'Duplicate line' }),
});

export type PurchaseOrderBody = z.infer<typeof purchaseOrderBodySchema>;
export type UpdatePurchaseOrderBody = z.infer<typeof updatePurchaseOrderSchema>;
export type ReceivePurchaseOrderBody = z.infer<typeof receivePurchaseOrderSchema>;
