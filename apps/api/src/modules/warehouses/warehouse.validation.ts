import { z } from 'zod';
import { optionalText } from '../../core/utils/validation.js';

export const warehouseBodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: optionalText(20),
  address: optionalText(300),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateWarehouseSchema = warehouseBodySchema.partial();

export type WarehouseBody = z.infer<typeof warehouseBodySchema>;
export type UpdateWarehouseBody = z.infer<typeof updateWarehouseSchema>;
