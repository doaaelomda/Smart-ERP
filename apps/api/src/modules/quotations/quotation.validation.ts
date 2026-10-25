import { z } from 'zod';
import { objectIdSchema, optionalText } from '../../core/utils/validation.js';
import { documentLinesSchema } from '../documents/document-lines.js';

export const quotationBodySchema = z.object({
  customerId: objectIdSchema,
  validUntil: z.coerce.date(),
  lines: documentLinesSchema,
  notes: optionalText(1000),
});

export const updateQuotationSchema = quotationBodySchema.partial();

export const convertQuotationSchema = z.object({
  dueDate: z.coerce.date().optional(),
  warehouseId: objectIdSchema.optional(),
});

export type QuotationBody = z.infer<typeof quotationBodySchema>;
export type UpdateQuotationBody = z.infer<typeof updateQuotationSchema>;
export type ConvertQuotationBody = z.infer<typeof convertQuotationSchema>;
