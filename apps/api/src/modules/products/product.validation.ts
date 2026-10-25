import { z } from 'zod';
import { PRODUCT_TYPES } from '@erp/shared';
import { moneySchema, optionalText } from '../../core/utils/validation.js';

export const productBodySchema = z.object({
  type: z.enum(PRODUCT_TYPES),
  sku: z.string().trim().min(1).max(40),
  barcode: optionalText(40),
  name: z.string().trim().min(2).max(150),
  category: optionalText(60),
  unit: optionalText(20),
  salePrice: moneySchema,
  avgCost: moneySchema.optional(),
  vatApplicable: z.boolean().optional(),
  reorderLevel: z.number().min(0).max(1_000_000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = productBodySchema.partial();

export type ProductBody = z.infer<typeof productBodySchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
