import { z } from 'zod';
import { PAYMENT_METHODS } from '@erp/shared';
import { objectIdSchema, optionalText } from '../../core/utils/validation.js';

export const paymentBodySchema = z.object({
  invoiceId: objectIdSchema,
  amount: z.number().int().positive().max(1e12),
  method: z.enum(PAYMENT_METHODS),
  date: z.coerce.date().optional(),
  reference: optionalText(80),
  notes: optionalText(500),
});

export type PaymentBody = z.infer<typeof paymentBodySchema>;
