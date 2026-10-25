import { z } from 'zod';
import { objectIdSchema, optionalText } from '../../core/utils/validation.js';
import { documentLinesSchema } from '../documents/document-lines.js';

export const invoiceBodySchema = z.object({
  customerId: objectIdSchema,
  warehouseId: objectIdSchema.optional(),
  dueDate: z.coerce.date(),
  lines: documentLinesSchema,
  notes: optionalText(1000),
});

export const updateInvoiceSchema = invoiceBodySchema.partial();

export const cancelInvoiceSchema = z.object({
  reason: z.string().trim().min(3).max(300),
});

export type InvoiceBody = z.infer<typeof invoiceBodySchema>;
export type UpdateInvoiceBody = z.infer<typeof updateInvoiceSchema>;
export type CancelInvoiceBody = z.infer<typeof cancelInvoiceSchema>;
